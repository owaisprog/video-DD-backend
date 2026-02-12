import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comments.model.js";
import asyncHandler from "../utils/asyncHandler.js";

const clampInt = (val, def, min, max) => {
  const n = Number.parseInt(String(val), 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
};

export const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const page = clampInt(req.query.page, 1, 1, 10_000);
  const limit = clampInt(req.query.limit, 10, 1, 50);

  // Aggregation to also include user fields
  const pipeline = [
    { $match: { video: new mongoose.Types.ObjectId(videoId) } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        text: 1,
        video: 1,
        user: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];

  const agg = Comment.aggregate(pipeline);

  const comments = await Comment.aggregatePaginate(agg, {
    page,
    limit,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Fetched all comments successfully"));
});

export const addComment = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId || req.body.videoId;
  const textRaw = req.body?.text;

  const text = typeof textRaw === "string" ? textRaw.trim() : "";

  if (!videoId) throw new ApiError(400, "videoId is required");
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  if (!text) throw new ApiError(400, "Text is required");

  const comment = await Comment.create({
    text,
    video: videoId,
    user: req.user?._id,
  });

  // Return comment with user populated (same shape as list)
  const created = await Comment.aggregate([
    { $match: { _id: comment._id } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
      },
    },
    { $unwind: "$user" },
    { $project: { text: 1, video: 1, user: 1, createdAt: 1, updatedAt: 1 } },
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, created?.[0], "Comment created successfully"));
});

export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const textRaw = req.body?.text;
  const text = typeof textRaw === "string" ? textRaw.trim() : "";

  if (!commentId) throw new ApiError(400, "commentId is required");
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }
  if (!text) throw new ApiError(400, "Text is required");

  const existing = await Comment.findById(commentId);
  if (!existing) throw new ApiError(404, "Comment not found");

  if (String(existing.user) !== String(req.user?._id)) {
    throw new ApiError(403, "You are not allowed to update this comment");
  }

  existing.text = text;
  await existing.save();

  const updated = await Comment.aggregate([
    { $match: { _id: existing._id } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
      },
    },
    { $unwind: "$user" },
    { $project: { text: 1, video: 1, user: 1, createdAt: 1, updatedAt: 1 } },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, updated?.[0], "Comment updated successfully"));
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) throw new ApiError(400, "commentId is required");
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const existing = await Comment.findById(commentId);
  if (!existing) throw new ApiError(404, "Comment not found");

  if (String(existing.user) !== String(req.user?._id)) {
    throw new ApiError(403, "You are not allowed to delete this comment");
  }

  await Comment.deleteOne({ _id: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});
