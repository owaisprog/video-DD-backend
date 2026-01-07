import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comments.model.js";

export const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (videoId) {
    throw new ApiError(400, "videoId is required");
  }

  const options = {
    page,
    limit,
  };

  const aggregate = await Comment.find({
    video: videoId,
  });

  const comments = await Comment.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Fetched all comments successfully"));
});

export const addComment = asyncHandler(async (req, res) => {
  const { text, videoId } = req.body;

  if (!(text || videoId)) {
    throw new ApiError(400, "Text and Video is required");
  }

  const comment = await Comment.create({
    text,
    video: videoId,
    user: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment created successfully"));
});

export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { text } = req.body;

  if (!(text || commentId)) {
    throw new ApiError(400, "Text and commentId is required");
  }

  const updatedComment = await Comment.findByIdAndUpdate(commentId, {
    $set: {
      text,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updateComment, "Comment updated successfully"));
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(200, "CommentId is required");
  }

  const deletedComment = await delete { _id: commentId };
  if (deletedComment.deletedCount === 0) {
    throw new ApiError(200, "Comment not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment is deleted successfully"));
});
