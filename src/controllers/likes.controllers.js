import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/likes.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comments.model.js";
import mongoose from "mongoose";

export const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new ApiError(400, "videoId is required");
  if (!mongoose.isValidObjectId(videoId))
    throw new ApiError(400, "Invalid videoId");

  const findVideo = await Video.findById(videoId);
  if (!findVideo) throw new ApiError(404, "Video not found");

  // ✅ atomic: delete if exists
  const deleted = await Like.findOneAndDelete({
    video: videoId,
    likedBy: req.user._id,
  });

  if (deleted) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Like deleted successfully")
      );
  }

  // ✅ create if not exists (handle race duplicates)
  try {
    const createdLike = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { liked: true, like: createdLike },
          "Like created successfully"
        )
      );
  } catch (err) {
    // ✅ if two requests race, second one hits duplicate key => treat as "liked"
    if (err?.code === 11000) {
      return res
        .status(200)
        .json(new ApiResponse(200, { liked: true }, "Like already exists"));
    }
    throw err;
  }
});

export const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "commentId is required");
  }

  const findComment = await Comment.findById(commentId);
  if (!findComment) {
    throw new ApiError(404, "Comment not found");
  }

  const deleteVideo = await Like.deleteOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (deleteVideo.deletedCount !== 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "like deleted successfully"));
  }

  const createdLike = await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (!createdLike) {
    throw new ApiError(400, "Error in creating like");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdLike, "Like created successfully"));
});

export const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!postId) {
    throw new ApiError(400, "postId is required");
  }

  const findPostt = await Comment.findById(commentId);
  if (!findPostt) {
    throw new ApiError(404, "Post not found");
  }

  const deleteVideo = await Like.deleteOne({
    post: postId,
    likedBy: req.user?._id,
  });

  if (deleteVideo.deletedCount !== 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "like deleted successfully"));
  }

  const createdLike = await Like.create({
    post: postId,
    likedBy: req.user?._id,
  });

  if (!createdLike) {
    throw new ApiError(400, "Error in creating like");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdLike, "Like created successfully"));
});

export const getLikedVideos = asyncHandler(async (req, res) => {
  const allLikeVideos = await Like.aggregate([
    {
      $match: { likedBy: new mongoose.Types.ObjectId(req.user?._id) },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "video",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "owner",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, allLikeVideos, "All Liked videos"));
});
