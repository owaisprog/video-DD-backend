import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadFileOnCloudinary = async (
  filePath,
  resourceType = "auto"
) => {
  try {
    if (!filePath) {
      console.error("File path is required for Cloudinary upload.");
      return null;
    }

    const absolutePath = path.resolve(filePath);
    const isVideo = resourceType === "video";

    const uploadOptions = {
      resource_type: resourceType,
      // ─── For videos: pre-generate HLS + optimized MP4 at upload time ───
      ...(isVideo && {
        eager: [
          // HLS adaptive stream — this is what your player will use
          { streaming_profile: "hd", format: "m3u8" },
          // Optimized MP4 fallback
          { quality: "auto", fetch_format: "auto", format: "mp4" },
        ],
        eager_async: true, // don't block the API response waiting for these
        // optional: Cloudinary pings this when eager is done
        eager_notification_url:
          process.env.CLOUDINARY_NOTIFICATION_URL || undefined,
      }),
    };

    console.log("Uploading to Cloudinary from:", absolutePath);
    const uploadResult = await cloudinary.uploader.upload(
      absolutePath,
      uploadOptions
    );
    console.log("Cloudinary upload success:", uploadResult.secure_url);

    // ─── Delete local temp file ───
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      console.error("Error deleting local file after upload:", err);
    }

    return uploadResult;
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Clean up local file even on failure
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Error deleting local file after failure:", err);
    }

    return null;
  }
};

// ─── Helper: build the correct URL depending on what you want to serve ───
export const getVideoUrl = (
  publicId,
  cloudName = process.env.CLOUDINARY_CLOUD_NAME
) => {
  return {
    // Use this in your <VideoPlayer> with hls.js
    hlsUrl: `https://res.cloudinary.com/${cloudName}/video/upload/sp_hd/${publicId}.m3u8`,

    // Fallback MP4 with auto quality + format
    mp4Url: `https://res.cloudinary.com/${cloudName}/video/upload/q_auto,f_auto,vc_auto/${publicId}.mp4`,
  };
};
