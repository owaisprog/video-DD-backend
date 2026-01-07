import dotenv from "dotenv";
dotenv.config(); // load .env

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadFileOnCloudinary = async (filePath) => {
  try {
    if (!filePath) {
      console.error(
        "For uploading image/video on cloudinary file path is required"
      );
      return null;
    }

    const absolutePath = path.resolve(filePath);
    console.log("Uploading file from:", absolutePath);

    const uploadResult = await cloudinary.uploader.upload(absolutePath, {
      resource_type: "auto",
    });

    console.log(uploadResult);

    console.log(
      "File is uploaded successfully on Cloudinary:",
      uploadResult.url
    );

    // delete local file AFTER success
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      console.error("Error deleting local file:", err);
    }

    return uploadResult;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    // delete file if it still exists
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Error deleting file after failure:", err);
    }
    return null;
  }
};
