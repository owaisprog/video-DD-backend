import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Post } from "../models/post.model.js";

export const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!(content || ownerId)) {
    throw new ApiError(400, "content and ownerId is required");
  }

  const post = await Post.create({
    content,
    owner: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post is created successfully"));
});

export const getUserPosts = asyncHandler(async (req, res) => {
  let { page = 1, limit = 20, sortBy, sortType, userId } = req.query;

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

  const sort = { [sortType]: sortBy === "asc" ? 1 : -1, _id: 1 };

  const aggregate = Post.aggregate([
    {
      $match: match,
    },
    {
      sort: sort,
    },
  ]);

  const posts = await Post.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Fetched posts data successfully"));
});

export const updatePost = asyncHandler(async (req, res) => {
  const { content, postId } = req.body;
  if (!postId) throw new ApiError(400, "postId is required");

  const updatedPost = await Post.findByIdAndUpdate(
    { _id: postId, owner: req.user._id }, // ✅ filter includes owner
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPost) {
    throw new ApiError(200, "Post not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatePost, "Post updated successfully"));
});

export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    throw new ApiError(200, "postId is required");
  }

  const deletePost = await Post.deleteOne({
    _id: postId,
  });

  if (deletePost.deletedCount === 0) {
    throw new ApiError(400, "Error in deleting post");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post deleted successfully"));
});
