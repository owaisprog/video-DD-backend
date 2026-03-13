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

    try {
      await setVideoProgress(videoId, {
        progress: 5,
        status: "queued",
        message: "Job started...",
      });

      await setVideoProgress(videoId, {
        progress: 10,
        status: "uploading",
        message: "Starting upload to Cloudinary...",
      });

      // Ticker keeps progress moving visually during long uploads
      const stopTicker = startProgressTicker({ videoId, from: 15, max: 55 });

      // ✅ Upload video with "video" resourceType — triggers eager HLS transforms
      // ✅ Upload thumbnail with "image" resourceType
      const videoPromise = (async () => {
        const v = await uploadFileOnCloudinary(videoPath, "video");
        await setVideoProgress(videoId, {
          progress: 65,
          status: "uploading",
          message: "Video uploaded successfully.",
        });
        return v;
      })();

      const thumbPromise = (async () => {
        const t = await uploadFileOnCloudinary(thumbnailPath, "image");
        await setVideoProgress(videoId, {
          progress: 55,
          status: "uploading",
          message: "Thumbnail uploaded successfully.",
        });
        return t;
      })();

      const [cloudinaryVideo, cloudinaryThumbnail] = await Promise.all([
        videoPromise,
        thumbPromise,
      ]);

      stopTicker();

      if (!cloudinaryVideo?.secure_url)
        throw new Error("Cloudinary video upload failed");
      if (!cloudinaryThumbnail?.secure_url)
        throw new Error("Cloudinary thumbnail upload failed");

      await setVideoProgress(videoId, {
        progress: 75,
        status: "saving",
        message: "Saving to database...",
      });

      const published = parseBoolean(isPublished, false);

      const updated = await Video.findByIdAndUpdate(
        videoId,
        {
          $set: {
            thumbnail: cloudinaryThumbnail.secure_url, // ✅ secure https URL for images
            videoFile: cloudinaryVideo.public_id, // ✅ public_id for HLS URL construction
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
        message: "Almost done...",
      });

      await setVideoProgress(videoId, {
        progress: 100,
        status: "done",
        message: "Video published successfully!",
      });

      return updated;
    } catch (err) {
      await setVideoProgress(videoId, {
        progress: 0,
        status: "failed",
        message: err?.message || "Unknown error occurred",
      });
      throw err;
    }
  },
  {
    connection: bullmqWorkerRedis,
    concurrency: 1,
  }
);
