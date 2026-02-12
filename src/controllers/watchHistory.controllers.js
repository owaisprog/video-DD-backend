import mongoose from "mongoose";
import { WatchHistory } from "../models/watchHistory.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const addToWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // ✅ BACKWARD COMPATIBLE:
  // supports BOTH: /add-to-watch-history/:videoId  AND body.videoId
  const videoId = req.params.videoId || req.body.videoId;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required.");
  }

  // Check if the video is already in the user's watch history
  let watchHistoryEntry = await WatchHistory.findOne({
    user: userId,
    video: videoId,
  });

  if (watchHistoryEntry) {
    // If it exists, update the timestamp to mark it as recently watched
    watchHistoryEntry.updatedAt = Date.now();
    await watchHistoryEntry.save();
  } else {
    // If it doesn't exist, create a new entry
    watchHistoryEntry = new WatchHistory({ user: userId, video: videoId });
    await watchHistoryEntry.save();
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Video added to watch history.", watchHistoryEntry)
    );
});

export const getWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let { page = 1, limit, query, sortBy, sortType } = req.query;

  page = Number(page);
  limit = Number(limit);

  const options = {
    page,
    limit,
  };

  let match = {};

  match.owner = new mongoose.Types.ObjectId(req?.user._id);
  const sort = { [sortType]: sortBy === "asc" ? -1 : 1, _id: 1 };
  const aggregate = WatchHistory.aggregate([
    { $match: { user: userId } },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    { $unwind: "$video" },
    { $sort: sort },
  ]);

  const watchHistory = await WatchHistory.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Watch history retrieved successfully.",
        watchHistory
      )
    );
});

export const removeFromWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required.");
  }

  const watchHistoryEntry = await WatchHistory.findOneAndDelete({
    user: userId,
    video: videoId,
  });

  if (!watchHistoryEntry) {
    throw new ApiError(404, "Watch history entry not found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Video removed from watch history.",
        watchHistoryEntry
      )
    );
});

export const clearWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const deletedCount = await WatchHistory.deleteMany({ user: userId });

  return res.status(200).json(
    new ApiResponse(200, "Watch history cleared successfully.", {
      deletedCount,
    })
  );
});
