// src/workers/video.worker.js
import { Worker, UnrecoverableError } from "bullmq";
import fs from "fs/promises";
import mongoose from "mongoose";

import bullmqWorkerRedis from "../config/bullmqWorkerRedis.js";
import { Video } from "../models/video.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { startProgressTicker } from "./helpers.js";
import { setVideoProgress } from "../utils/videoProgress.js";

const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024; // 10 MB

function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }

  return defaultValue;
}

function assertMongoConnected() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is not connected in worker");
  }
}

async function assertFileExists(filePath, label) {
  try {
    await fs.access(filePath);
  } catch {
    throw new UnrecoverableError(
      `${label} file not found at path: ${filePath}`
    );
  }
}

async function assertFileSizeUnderLimit(filePath, maxBytes, label) {
  const stat = await fs.stat(filePath);

  if (stat.size > maxBytes) {
    const mb = (stat.size / (1024 * 1024)).toFixed(2);
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(2);

    throw new UnrecoverableError(
      `${label} is too large (${mb} MB). Maximum allowed is ${maxMb} MB.`
    );
  }
}

async function cleanupLocalFiles(...paths) {
  await Promise.allSettled(
    paths.filter(Boolean).map(async (filePath) => {
      try {
        await fs.unlink(filePath);
        console.log("Deleted temp file:", filePath);
      } catch (err) {
        if (err?.code !== "ENOENT") {
          console.error("Failed to remove temp file:", filePath, err);
        }
      }
    })
  );
}

function normalizeCloudinaryResult(result) {
  if (!result) return null;

  return {
    ...result,
    url: result.secure_url || result.url || null,
  };
}

function normalizeWorkerError(err) {
  if (!err) {
    return new Error("Unknown error");
  }

  if (err instanceof UnrecoverableError) {
    return err;
  }

  if (err?.http_code && err.http_code >= 400 && err.http_code < 500) {
    return new UnrecoverableError(err.message || "Cloudinary upload failed");
  }

  if (err?.code === "ENOENT") {
    return new UnrecoverableError(err.message || "Local file not found");
  }

  return err;
}

function shouldCleanupFiles(job, err) {
  if (!err) return true;

  if (err instanceof UnrecoverableError) return true;

  const maxAttempts = Number(job?.opts?.attempts ?? 1);
  const currentAttempt = Number(job?.attemptsMade ?? 0) + 1;

  return currentAttempt >= maxAttempts;
}

export function startVideoWorker() {
  return new Worker(
    "videoProcessing",
    async (job) => {
      const { videoPath, thumbnailPath, videoId, isPublished } = job.data ?? {};
      let stopTicker = null;
      let finalError = null;

      try {
        assertMongoConnected();

        if (!videoId) {
          throw new UnrecoverableError("Missing required field: videoId");
        }

        if (!videoPath) {
          throw new UnrecoverableError("Missing required field: videoPath");
        }

        if (!thumbnailPath) {
          throw new UnrecoverableError("Missing required field: thumbnailPath");
        }

        console.log("Processing video job:", {
          jobId: job.id,
          videoId,
          videoPath,
          thumbnailPath,
        });

        await setVideoProgress(videoId, {
          progress: 5,
          status: "queued",
          message: "Job started...",
        });

        await setVideoProgress(videoId, {
          progress: 10,
          status: "checking",
          message: "Checking uploaded files...",
        });

        await assertFileExists(videoPath, "Video");
        await assertFileExists(thumbnailPath, "Thumbnail");

        await assertFileSizeUnderLimit(
          thumbnailPath,
          MAX_THUMBNAIL_BYTES,
          "Thumbnail"
        );

        await setVideoProgress(videoId, {
          progress: 15,
          status: "uploading",
          message: "Uploading video and thumbnail...",
        });

        stopTicker = startProgressTicker({
          videoId,
          from: 15,
          max: 55,
        });

        const [videoResult, thumbResult] = await Promise.allSettled([
          uploadFileOnCloudinary(videoPath, "video"),
          uploadFileOnCloudinary(thumbnailPath, "image"),
        ]);

        if (videoResult.status === "rejected") {
          throw normalizeWorkerError(videoResult.reason);
        }

        if (thumbResult.status === "rejected") {
          throw normalizeWorkerError(thumbResult.reason);
        }

        const cloudinaryVideo = normalizeCloudinaryResult(videoResult.value);
        const cloudinaryThumbnail = normalizeCloudinaryResult(
          thumbResult.value
        );

        if (!cloudinaryVideo?.url) {
          throw new Error("Cloudinary video upload failed");
        }

        if (!cloudinaryThumbnail?.url) {
          throw new Error("Cloudinary thumbnail upload failed");
        }

        if (typeof stopTicker === "function") {
          stopTicker();
          stopTicker = null;
        }

        await setVideoProgress(videoId, {
          progress: 75,
          status: "saving",
          message: "Uploads complete. Saving video data...",
        });

        assertMongoConnected();

        const published = parseBoolean(isPublished, false);

        const updated = await Video.findByIdAndUpdate(
          videoId,
          {
            $set: {
              thumbnail: cloudinaryThumbnail.url,
              videoFile: cloudinaryVideo.url,
              duration: cloudinaryVideo.duration ?? null,
              isPublished: published,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (!updated) {
          throw new UnrecoverableError(`Video not found for id: ${videoId}`);
        }

        await setVideoProgress(videoId, {
          progress: 100,
          status: "completed",
          message: "Video processed successfully.",
        });

        return updated;
      } catch (err) {
        finalError = normalizeWorkerError(err);

        try {
          if (typeof stopTicker === "function") {
            stopTicker();
            stopTicker = null;
          }

          if (videoId) {
            await setVideoProgress(videoId, {
              progress: 0,
              status: "failed",
              message: finalError?.message || "Unknown error",
            });
          }
        } catch (progressErr) {
          console.error("Failed to update video progress:", progressErr);
        }

        throw finalError;
      } finally {
        if (typeof stopTicker === "function") {
          stopTicker();
        }

        if (shouldCleanupFiles(job, finalError)) {
          await cleanupLocalFiles(videoPath, thumbnailPath);
        }
      }
    },
    {
      connection: bullmqWorkerRedis,
      concurrency: 1,
    }
  );
}
