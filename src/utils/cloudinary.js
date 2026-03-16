import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Normalize old and new call styles:
 *
 * Old style:
 *   uploadFileOnCloudinary(filePath, "video")
 *
 * New style:
 *   uploadFileOnCloudinary(filePath, { resource_type: "video" })
 */
function resolveUploadOptions(resourceTypeOrOptions = "auto") {
  if (typeof resourceTypeOrOptions === "string") {
    return { resource_type: resourceTypeOrOptions };
  }

  if (
    resourceTypeOrOptions &&
    typeof resourceTypeOrOptions === "object" &&
    !Array.isArray(resourceTypeOrOptions)
  ) {
    return {
      resource_type: resourceTypeOrOptions.resource_type || "auto",
      ...resourceTypeOrOptions,
    };
  }

  return { resource_type: "auto" };
}

/**
 * Upload a local file to Cloudinary.
 *
 * Important:
 * - This helper DOES NOT delete the local file.
 * - It throws errors so the worker can decide retry behavior.
 */
export const uploadFileOnCloudinary = async (
  filePath,
  resourceTypeOrOptions = "auto"
) => {
  if (!filePath) {
    throw new Error("File path is required for Cloudinary upload.");
  }

  const absolutePath = path.resolve(filePath);
  const uploadOptions = resolveUploadOptions(resourceTypeOrOptions);
  const isVideo = uploadOptions.resource_type === "video";

  const finalUploadOptions = {
    ...uploadOptions,

    // For videos: pre-generate HLS + optimized MP4
    ...(isVideo && {
      eager: [
        { streaming_profile: "hd", format: "m3u8" },
        { quality: "auto", fetch_format: "auto", format: "mp4" },
      ],
      eager_async: true,
      eager_notification_url:
        process.env.CLOUDINARY_NOTIFICATION_URL || undefined,
    }),
  };

  try {
    await fs.access(absolutePath);

    console.log("Uploading to Cloudinary from:", absolutePath);

    const uploadResult = await cloudinary.uploader.upload(
      absolutePath,
      finalUploadOptions
    );

    console.log(
      "Cloudinary upload success:",
      uploadResult?.secure_url || uploadResult?.url
    );

    return uploadResult;
  } catch (error) {
    console.error("Cloudinary upload error:", {
      message: error?.message,
      name: error?.name,
      http_code: error?.http_code,
      filePath: absolutePath,
    });

    throw error;
  }
};

/**
 * Safely delete a local temp file.
 * Use this in the worker's finally block, not inside uploadFileOnCloudinary.
 */
export const deleteLocalFileIfExists = async (filePath) => {
  if (!filePath) return;

  const absolutePath = path.resolve(filePath);

  try {
    await fs.unlink(absolutePath);
    console.log("Deleted local temp file:", absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("Error deleting local file:", absolutePath, error);
    }
  }
};

/**
 * Optional helper to check file size before upload.
 * Useful for rejecting huge thumbnails early.
 */
export const getLocalFileStats = async (filePath) => {
  if (!filePath) {
    throw new Error("File path is required.");
  }

  const absolutePath = path.resolve(filePath);
  return fs.stat(absolutePath);
};

// Build Cloudinary playback URLs
export const getVideoUrl = (
  publicId,
  cloudName = process.env.CLOUDINARY_CLOUD_NAME
) => {
  return {
    hlsUrl: `https://res.cloudinary.com/${cloudName}/video/upload/sp_hd/${publicId}.m3u8`,
    mp4Url: `https://res.cloudinary.com/${cloudName}/video/upload/q_auto,f_auto,vc_auto/${publicId}.mp4`,
  };
};
