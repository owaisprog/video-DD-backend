import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Post } from "../models/post.model.js";
import asyncHandler from "../utils/asyncHandler.js";

const toObjectId = (id, name = "id") => {
  if (!id || !isValidObjectId(id)) throw new ApiError(400, `Invalid ${name}`);
  return new mongoose.Types.ObjectId(id);
};

export const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || String(content).trim() === "") {
    throw new ApiError(400, "content is required");
  }

  const post = await Post.create({
    content: String(content).trim(),
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, post, "Post is created successfully"));
});

export const getUserPosts = asyncHandler(async (req, res) => {
  let {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  page = Number(page);
  limit = Number(limit);

  const options = { page, limit };

  const match = {};
  if (userId) {
    if (!isValidObjectId(String(userId))) {
      throw new ApiError(400, "Invalid userId");
    }
    match.owner = new mongoose.Types.ObjectId(String(userId));
  }

  const allowedSortFields = new Set(["createdAt", "updatedAt", "_id"]);
  if (!allowedSortFields.has(String(sortBy))) sortBy = "createdAt";

  const dir = String(sortType).toLowerCase() === "asc" ? 1 : -1;
  const sort = { [sortBy]: dir, _id: 1 };

  const aggregate = Post.aggregate([
    { $match: match },
    { $sort: sort },

    // ✅ FIX: correct collection name is "users"
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          // ✅ only send what you need
          { $project: { _id: 1, username: 1, fullname: 1, avatar: 1, email: 1 } },
        ],
      },
    },

    // ✅ convert owner array -> owner object (or null)
    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "likes",
        foreignField: "post",
        localField: "_id",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        foreignField: "post",
        localField: "_id",
        as: "comments",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        commentCounts: { $size: "$comments" },
      },
    },
    { $project: { likes: 0, comments: 0 } },
  ]);

  const posts = await Post.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Fetched posts data successfully"));
});

export const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  const pid = toObjectId(postId, "postId");

  if (content === undefined || String(content).trim() === "") {
    throw new ApiError(400, "content is required");
  }

  const updatedPost = await Post.findOneAndUpdate(
    { _id: pid, owner: req.user?._id }, // ✅ owner protected
    { $set: { content: String(content).trim() } },
    { new: true }
  );

  if (!updatedPost) {
    throw new ApiError(404, "Post not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPost, "Post updated successfully"));
});

export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const pid = toObjectId(postId, "postId");

  const deleted = await Post.deleteOne({
    _id: pid,
    owner: req.user?._id, // ✅ owner protected
  });

  if (deleted.deletedCount === 0) {
    throw new ApiError(404, "Post not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post deleted successfully"));
});
