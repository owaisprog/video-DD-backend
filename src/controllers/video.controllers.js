import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

export const publishVideo = asyncHandler(async (req, res) => {
  // take all fields from body
  // take videoFile from req.file
  // make condition on all required fields
  // publish videoFile to cloudinary
  // send json response

  const { title, description } = req.body;

  const fieldsArray = [
    { name: "title", value: title },
    { name: "description", value: description },
  ];

  for (const { name, value } of fieldsArray) {
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new ApiError(409, `${name} is required`);
    }
  }

  const videoPath = req.files?.video[0].path;
  const thumbnailPath = req.files?.thumbnail[0].path;

  if (!videoPath) {
    throw new ApiError(409, "Video is required");
  }
  if (!thumbnailPath) {
    throw new ApiError(409, "Thumbnail is required");
  }

  const cloudinaryVideo = await uploadFileOnCloudinary(videoPath);
  const cloudinarythumbnail = await uploadFileOnCloudinary(thumbnailPath);

  if (!cloudinaryVideo) {
    throw new ApiError(409, "Video url is required");
  }
  if (!cloudinarythumbnail) {
    throw new ApiError(409, "Thumbnail url is required");
  }

  const video = await Video.create({
    thumbnail: cloudinarythumbnail.url,
    title,
    description,
    videoFile: cloudinaryVideo.url,
    duration: cloudinaryVideo.duration,
    owner: req.user?._id,
  });

  console.log("fieldsArray", fieldsArray);
  console.log("videoPath", videoPath);
  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video publish successfully"));
});

export const getAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 20, query, sortBy, sortType, userId } = req.query;

  page = Number(page);
  limit = Number(limit);

  const options = {
    page,
    limit,
  };

  let match = {};

  if (userId) {
    match.owner = new mongoose.Types.ObjectId(userId);
  }

  if (query) {
    match.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  const sort = { [sortType]: sortBy === "asc" ? -1 : 1, _id: 1 };

  const aggregate = Video.aggregate([
    {
      $match: match,
    },
    {
      $sort: sort,
    },
  ]);

  const videos = await Video.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Video data fetched successfully"));
});

export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video data fetched successfully"));
});

export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = req.file.path;

  if (!video) {
    throw new Error(409, "Video is required");
  }

  const cloudinaryVideo = await uploadFileOnCloudinary(video);

  if (!cloudinaryVideo) {
    throw new ApiError(409, "Video url is required");
  }
  const updatedVideo = await Video.findByIdAndUpdate(videoId, {
    $set: {
      video: cloudinaryVideo.url,
    },
    new: true,
  });

  if (!updateVideo) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const result = await Video.deleteOne({
    _id: videoId,
  });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findByIdAndUpdate(
    {
      _id: videoId,
      owner: req.user?._id,
    },
    [
      {
        $set: { isPublished: { $not: "$isPublished" } },
      },
    ]
  );

  if (!video) {
    throw new Error(400, "Video not found");
  }

  const msg = video.isPublished
    ? "Video published successfully"
    : "Video unpublished successfully";

  return res.status(200).json(new ApiResponse(200, video, msg));
});
