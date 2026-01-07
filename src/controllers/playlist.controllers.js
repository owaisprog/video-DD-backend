import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const fieldsArray = [
    { name: "name", value: name },
    { name: "description", value: description },
  ];

  for (const { name, value } of fieldsArray) {
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new ApiError(400, `${name} is required`);
    }
  }

  const playList = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, userId } = req.params;

  page = Number(page);
  limit = Number(limit);

  const options = {
    page,
    limit,
  };

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(200, "Invalid userId");
    }
  }

  const aggregate = Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $lookup: {
        from: "Video",
        localField: "videos",
        foreignField: "_id",
        as: "Videos",
        pipeline: [
          {
            $lookup: {
              from: "User",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
        ],
      },
    },
  ]);

  const playList = await Playlist.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Fetched playlist successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, playlistId } = req.params;
  page = Number(page);
  limit = Number(limit);

  const options = {
    page,
    limit,
  };

  if (userId) {
    if (!isValidObjectId(playlistId)) {
      throw new ApiError(200, "Invalid playlistId");
    }
  }

  const aggregate = Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $lookup: {
        from: "Video",
        localField: "videos",
        foreignField: "_id",
        as: "Videos",
        pipeline: [
          {
            $lookup: {
              from: "User",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
        ],
      },
    },
  ]);

  const playList = await Playlist.aggregatePaginate(aggregate, options);
  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Fetched playlist successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || !videoId) {
    throw new ApiError(400, "playlistId and videoId is required");
  }

  if (playlistId) {
    if (!isValidObjectId(playlistId)) {
      throw new ApiError(200, "Invalid playlistId");
    }
  }
  if (videoId) {
    if (!isValidObjectId(videoId)) {
      throw new ApiError(200, "Invalid videoId");
    }
  }

  const videoExists = await Video.exists({ _id: videoId });
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  const playList = await Playlist.findByIdAndUpdate(
    { _id: playlistId, owner: req.user?._id },
    {
      $addToSet: { videos: videoId },
    },
    {
      new: true,
    }
  );

  if (!playList) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Video is added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || !videoId) {
    throw new ApiError(400, "playlistId and videoId is required");
  }

  if (playlistId) {
    if (!isValidObjectId(playlistId)) {
      throw new ApiError(200, "Invalid playlistId");
    }
  }
  if (videoId) {
    if (!isValidObjectId(videoId)) {
      throw new ApiError(200, "Invalid videoId");
    }
  }

  const videoExists = await Video.exists({ _id: videoId });
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  const playList = await Playlist.findByIdAndUpdate(
    { _id: playlistId, owner: req.user?._id },
    {
      $pull: { videos: videoId },
    },
    {
      new: true,
    }
  );

  if (!playList) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Video is removed from playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(200, "playlistId is required");
  }

  if (playlistId) {
    if (!isValidObjectId(playlistId)) {
      throw new ApiError(200, "Invalid playlistId");
    }
  }

  const deletedPlaylist = await Playlist.deleteOne({
    _id: playlistId,
    owner: req.user?._id,
  });

  if (deletedPlaylist.deletedCount === 0) {
    throw new ApiError(400, "Playlist is not delete");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist is deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  if (!playlistId) {
    throw new ApiError(200, "playlistId is required");
  }

  if (playlistId) {
    if (!isValidObjectId(playlistId)) {
      throw new ApiError(200, "Invalid playlistId");
    }
  }

  const playlist = await Playlist.findByIdAndUpdate(
    { _id: playlistId, owner: req.user?._id },
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
