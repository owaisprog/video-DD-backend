// workers/video.worker.js
import { Worker } from "bullmq";
import bullmqWorkerRedis from "../config/bullmqWorkerRedis.js";
import { Video } from "../models/video.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { startProgressTicker } from "./helpers.js";
import { setVideoProgress } from "../utils/videoProgress.js";

function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return defaultValue;
}

export const videoProcessingWorker = new Worker(
  "videoProcessing",
  async (job) => {
    const { videoPath, thumbnailPath, videoId, isPublished } = job.data || {};

    if (!videoId) throw new Error("Missing required field: videoId");
    if (!videoPath) throw new Error("Missing required field: videoPath");
    if (!thumbnailPath)
      throw new Error("Missing required field: thumbnailPath");

    // (Optional) BullMQ progress (if using bull-board etc.)
    // await job.updateProgress(5);

    try {
      await setVideoProgress(videoId, {
        progress: 5,
        status: "queued",
        message: "Job started...",
      });

      await setVideoProgress(videoId, {
        progress: 10,
        status: "uploading",
        message: "Uploading video & thumbnail...",
      });

      // Start ticker so progress doesn’t look stuck during long uploads
      const stopTicker = startProgressTicker({ videoId, from: 15, max: 55 });

      // Uploads with milestone updates
      const videoPromise = (async () => {
        const v = await uploadFileOnCloudinary(videoPath);
        await setVideoProgress(videoId, {
          progress: 60,
          status: "uploading",
          message: "Video uploaded. Uploading thumbnail...",
        });
        return v;
      })();

      const thumbPromise = (async () => {
        const t = await uploadFileOnCloudinary(thumbnailPath);
        await setVideoProgress(videoId, {
          progress: 50,
          status: "uploading",
          message: "Thumbnail uploaded. Uploading video...",
        });
        return t;
      })();

      const [cloudinaryVideo, cloudinaryThumbnail] = await Promise.all([
        videoPromise,
        thumbPromise,
      ]);

      stopTicker();

      if (!cloudinaryVideo?.url)
        throw new Error("Cloudinary video upload failed");
      if (!cloudinaryThumbnail?.url)
        throw new Error("Cloudinary thumbnail upload failed");

      await setVideoProgress(videoId, {
        progress: 50,
        status: "uploading",
        message: "Thumbnail uploaded. Uploading video...",
      });

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
        { new: true, runValidators: true }
      );

      if (!updated) throw new Error(`Video not found for id: ${videoId}`);

      await setVideoProgress(videoId, {
        progress: 95,
        status: "finalizing",
        message: "Finalizing...",
      });

      await setVideoProgress(videoId, {
        progress: 100,
        status: "uploading",
        message: "Thumbnail uploaded. Uploading video...",
      });

      // Optional cleanup
      // await redis.expire(progressKey(videoId), 60 * 60);

      return updated;
    } catch (err) {
      await setVideoProgress(videoId, {
        progress: 0,
        status: "failed",
        message: err?.message || "Unknown error",
      });
      throw err;
    }
  },
  {
    connection: bullmqWorkerRedis,
    concurrency: 1,
  }
);
