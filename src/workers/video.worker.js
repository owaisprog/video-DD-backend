import { Worker, UnrecoverableError } from "bullmq";
import fs from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

import bullmqWorkerRedis from "../config/bullmqWorkerRedis.js";
import { Video } from "../models/video.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { startProgressTicker } from "./helpers.js";
import { setVideoProgress } from "../utils/videoProgress.js";

const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024; // 10 MB
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "ffprobe";

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
    [...new Set(paths.filter(Boolean))].map(async (filePath) => {
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

function stopTickerSafely(stopTicker) {
  if (typeof stopTicker === "function") {
    stopTicker();
  }
}

function pickThumbnailSeekSeconds(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 1;
  }

  if (durationSeconds <= 1) {
    return 0;
  }

  const candidate = durationSeconds >= 8 ? durationSeconds * 0.25 : 1;
  return Math.max(0, Math.min(candidate, durationSeconds - 0.2));
}

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      if (err?.code === "ENOENT") {
        return reject(
          new UnrecoverableError(
            `${label} binary not found. Install it or set the correct path in environment variables.`
          )
        );
      }

      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        return resolve({ stdout, stderr });
      }

      reject(
        new Error(
          `${label} failed with exit code ${code}${
            stderr ? `: ${stderr.trim()}` : ""
          }`
        )
      );
    });
  });
}

async function getVideoDurationInSeconds(videoPath) {
  const { stdout } = await runCommand(
    FFPROBE_PATH,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ],
    "ffprobe"
  );

  const duration = Number.parseFloat(String(stdout).trim());

  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error("Unable to determine video duration with ffprobe");
  }

  return duration;
}

function buildGeneratedThumbnailPath(videoId) {
  return path.join(
    os.tmpdir(),
    `video-thumb-${videoId || "unknown"}-${Date.now()}-${randomUUID()}.jpg`
  );
}

async function generateThumbnailFromVideo(videoPath, videoId) {
  const outputPath = buildGeneratedThumbnailPath(videoId);

  let durationSeconds = null;
  try {
    durationSeconds = await getVideoDurationInSeconds(videoPath);
  } catch (err) {
    console.warn(
      "Could not determine video duration. Falling back to default thumbnail seek time.",
      err?.message || err
    );
  }

  const seekSeconds = pickThumbnailSeekSeconds(durationSeconds);

  await runCommand(
    FFMPEG_PATH,
    [
      "-y",
      "-ss",
      seekSeconds.toFixed(3),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "-vf",
      "scale=1280:-1:force_original_aspect_ratio=decrease",
      outputPath,
    ],
    "ffmpeg"
  );

  await assertFileExists(outputPath, "Generated thumbnail");
  await assertFileSizeUnderLimit(
    outputPath,
    MAX_THUMBNAIL_BYTES,
    "Generated thumbnail"
  );

  return outputPath;
}

async function uploadSelectedAssets({ videoPath, thumbnailPath }) {
  const [videoResult, thumbResult] = await Promise.allSettled([
    videoPath
      ? uploadFileOnCloudinary(videoPath, "video")
      : Promise.resolve(null),
    thumbnailPath
      ? uploadFileOnCloudinary(thumbnailPath, "image")
      : Promise.resolve(null),
  ]);

  if (videoPath && videoResult.status === "rejected") {
    throw normalizeWorkerError(videoResult.reason);
  }

  if (thumbnailPath && thumbResult.status === "rejected") {
    throw normalizeWorkerError(thumbResult.reason);
  }

  const cloudinaryVideo =
    videoPath && videoResult.status === "fulfilled"
      ? normalizeCloudinaryResult(videoResult.value)
      : null;

  const cloudinaryThumbnail =
    thumbnailPath && thumbResult.status === "fulfilled"
      ? normalizeCloudinaryResult(thumbResult.value)
      : null;

  if (videoPath && !cloudinaryVideo?.url) {
    throw new Error("Cloudinary video upload failed");
  }

  if (thumbnailPath && !cloudinaryThumbnail?.url) {
    throw new Error("Cloudinary thumbnail upload failed");
  }

  return { cloudinaryVideo, cloudinaryThumbnail };
}

async function processPublishJob(job) {
  const { videoPath, thumbnailPath, videoId, isPublished } = job.data ?? {};
  let stopTicker = null;
  let finalError = null;
  let generatedThumbnailPath = null;
  let effectiveThumbnailPath = thumbnailPath || null;

  try {
    assertMongoConnected();

    if (!videoId) {
      throw new UnrecoverableError("Missing required field: videoId");
    }

    if (!videoPath) {
      throw new UnrecoverableError("Missing required field: videoPath");
    }

    console.log("Processing publish job:", {
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

    if (effectiveThumbnailPath) {
      await assertFileExists(effectiveThumbnailPath, "Thumbnail");
      await assertFileSizeUnderLimit(
        effectiveThumbnailPath,
        MAX_THUMBNAIL_BYTES,
        "Thumbnail"
      );
    } else {
      await setVideoProgress(videoId, {
        progress: 12,
        status: "processing",
        message: "No thumbnail uploaded. Generating thumbnail from video...",
      });

      generatedThumbnailPath = await generateThumbnailFromVideo(
        videoPath,
        videoId
      );
      effectiveThumbnailPath = generatedThumbnailPath;
    }

    await setVideoProgress(videoId, {
      progress: 15,
      status: "uploading",
      message: thumbnailPath
        ? "Uploading video and thumbnail..."
        : "Uploading video and generated thumbnail...",
    });

    stopTicker = startProgressTicker({
      videoId,
      from: 15,
      max: 55,
    });

    const { cloudinaryVideo, cloudinaryThumbnail } = await uploadSelectedAssets(
      {
        videoPath,
        thumbnailPath: effectiveThumbnailPath,
      }
    );

    stopTickerSafely(stopTicker);
    stopTicker = null;

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
      stopTickerSafely(stopTicker);
      stopTicker = null;

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
    stopTickerSafely(stopTicker);

    if (shouldCleanupFiles(job, finalError)) {
      await cleanupLocalFiles(videoPath, thumbnailPath, generatedThumbnailPath);
    }
  }
}

async function processUpdateAssetsJob(job) {
  const {
    videoId,
    ownerId,
    // New fields — Cloudinary URLs already uploaded by the controller
    cloudinaryVideoUrl,
    cloudinaryThumbnailUrl,
    cloudinaryVideoDuration,
    // Legacy fields — local file paths (backwards compatibility)
    videoPath,
    thumbnailPath,
  } = job.data ?? {};

  let stopTicker = null;
  let finalError = null;

  // Determine whether we already have Cloudinary URLs or need to upload
  const hasCloudinaryVideo = Boolean(cloudinaryVideoUrl);
  const hasCloudinaryThumbnail = Boolean(cloudinaryThumbnailUrl);
  const hasLocalVideo = Boolean(videoPath);
  const hasLocalThumbnail = Boolean(thumbnailPath);
  const hasAnything =
    hasCloudinaryVideo ||
    hasCloudinaryThumbnail ||
    hasLocalVideo ||
    hasLocalThumbnail;

  try {
    assertMongoConnected();

    if (!videoId) {
      throw new UnrecoverableError("Missing required field: videoId");
    }

    if (!hasAnything) {
      throw new UnrecoverableError(
        "At least one of cloudinaryVideoUrl, cloudinaryThumbnailUrl, videoPath, or thumbnailPath is required"
      );
    }

    console.log("Processing update-assets job:", {
      jobId: job.id,
      videoId,
      ownerId,
      cloudinaryVideoUrl: cloudinaryVideoUrl ?? null,
      cloudinaryThumbnailUrl: cloudinaryThumbnailUrl ?? null,
      videoPath: videoPath ?? null,
      thumbnailPath: thumbnailPath ?? null,
    });

    await setVideoProgress(videoId, {
      progress: 5,
      status: "queued",
      message: "Update job started...",
    });

    // ── Build the DB $set from pre-uploaded Cloudinary URLs ──
    const updateSet = {};

    if (hasCloudinaryVideo) {
      updateSet.videoFile = cloudinaryVideoUrl;
      if (cloudinaryVideoDuration != null) {
        updateSet.duration = cloudinaryVideoDuration;
      }
    }

    if (hasCloudinaryThumbnail) {
      updateSet.thumbnail = cloudinaryThumbnailUrl;
    }

    // ── If local paths were provided, upload them (legacy / fallback) ──
    if (hasLocalVideo || hasLocalThumbnail) {
      await setVideoProgress(videoId, {
        progress: 10,
        status: "checking",
        message: "Checking uploaded files...",
      });

      if (hasLocalVideo) {
        await assertFileExists(videoPath, "Video");
      }

      if (hasLocalThumbnail) {
        await assertFileExists(thumbnailPath, "Thumbnail");
        await assertFileSizeUnderLimit(
          thumbnailPath,
          MAX_THUMBNAIL_BYTES,
          "Thumbnail"
        );
      }

      const uploadMessage =
        hasLocalVideo && hasLocalThumbnail
          ? "Uploading video and thumbnail..."
          : hasLocalVideo
            ? "Uploading video..."
            : "Uploading thumbnail...";

      await setVideoProgress(videoId, {
        progress: 15,
        status: "uploading",
        message: uploadMessage,
      });

      stopTicker = startProgressTicker({
        videoId,
        from: 15,
        max: 55,
      });

      const { cloudinaryVideo, cloudinaryThumbnail } =
        await uploadSelectedAssets({
          videoPath: hasLocalVideo ? videoPath : null,
          thumbnailPath: hasLocalThumbnail ? thumbnailPath : null,
        });

      stopTickerSafely(stopTicker);
      stopTicker = null;

      if (cloudinaryVideo?.url) {
        updateSet.videoFile = cloudinaryVideo.url;
        updateSet.duration = cloudinaryVideo.duration ?? null;
      }

      if (cloudinaryThumbnail?.url) {
        updateSet.thumbnail = cloudinaryThumbnail.url;
      }
    }

    // ── Persist to MongoDB ──
    if (Object.keys(updateSet).length === 0) {
      throw new UnrecoverableError("No valid uploaded assets to update");
    }

    await setVideoProgress(videoId, {
      progress: 75,
      status: "saving",
      message: "Saving updated video data...",
    });

    assertMongoConnected();

    const filter = ownerId
      ? { _id: videoId, owner: ownerId }
      : { _id: videoId };

    const updated = await Video.findOneAndUpdate(
      filter,
      { $set: updateSet },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      throw new UnrecoverableError(
        `Video not found or not authorized for id: ${videoId}`
      );
    }

    const hasVideo = hasCloudinaryVideo || hasLocalVideo;
    const hasThumbnail = hasCloudinaryThumbnail || hasLocalThumbnail;
    const completedMessage =
      hasVideo && hasThumbnail
        ? "Video and thumbnail updated successfully."
        : hasVideo
          ? "Video updated successfully."
          : "Thumbnail updated successfully.";

    await setVideoProgress(videoId, {
      progress: 100,
      status: "completed",
      message: completedMessage,
    });

    return updated;
  } catch (err) {
    finalError = normalizeWorkerError(err);

    try {
      stopTickerSafely(stopTicker);
      stopTicker = null;

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
    stopTickerSafely(stopTicker);

    if (shouldCleanupFiles(job, finalError)) {
      await cleanupLocalFiles(videoPath, thumbnailPath);
    }
  }
}

export function startVideoWorker() {
  return new Worker(
    "videoProcessing",
    async (job) => {
      switch (job.name) {
        case "upload-and-publish":
          return processPublishJob(job);

        case "update-video-assets":
          return processUpdateAssetsJob(job);

        default:
          throw new UnrecoverableError(`Unsupported job name: ${job.name}`);
      }
    },
    {
      connection: bullmqWorkerRedis,
      concurrency: 1,
    }
  );
}
