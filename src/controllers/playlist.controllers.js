import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const toObjectId = (id, name = "id") => {
  if (!id || !isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${name}`);
  }
  return new mongoose.Types.ObjectId(id);
};

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || String(name).trim() === "") {
    throw new ApiError(400, "name is required");
  }
  if (!description || String(description).trim() === "") {
    throw new ApiError(400, "description is required");
  }

  const playList = await Playlist.create({
    name: String(name).trim(),
    description: String(description).trim(),
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playList, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, userId, sortBy, sortType } = req.params;

  page = Number(page);
  limit = Number(limit);

  const ownerId = toObjectId(userId, "userId");

  // ✅ security: don’t allow fetching other users playlists
  if (String(req.user?._id) !== String(ownerId)) {
    throw new ApiError(403, "Forbidden");
  }
  const sort = { [sortType]: sortBy === "asc" ? -1 : 1, _id: 1 };

  const options = { page, limit };

  const aggregate = Playlist.aggregate([
    { $match: { owner: ownerId } },

    { $sort: sort },

    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "Videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
          {
            $project: {
              _id: 1,
              thumbnail: 1,
              title: 1,
              owner: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
      },
    },

    // keep playlist response light
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        videos: 1,
        Videos: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  const playList = await Playlist.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Fetched playlists successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, playlistId } = req.params;

  page = Number(page);
  limit = Number(limit);

  const pid = toObjectId(playlistId, "playlistId");
  const skip = (page - 1) * limit;

  // ✅ This endpoint should paginate VIDEOS inside the playlist
  // We'll return: { docs:[playlistDocWithVideosPage], page, totalPages }
  const result = await Playlist.aggregate([
    // ✅ ensure user only accesses their own playlist
    { $match: { _id: pid, owner: toObjectId(String(req.user?._id), "owner") } },

    // compute total video count from ids array
    {
      $addFields: {
        videosCount: { $size: { $ifNull: ["$videos", []] } },
      },
    },

    // ✅ paginated lookup of Videos
    {
      $lookup: {
        from: "videos",
        let: { videoIds: "$videos" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$_id", "$$videoIds"] },
            },
          },
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
          {
            $project: {
              _id: 1,
              thumbnail: 1,
              title: 1,
              description: 1,
              views: 1,
              duration: 1,
              owner: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
        as: "Videos",
      },
    },

    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        videos: 1,
        videosCount: 1,
        Videos: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  const doc = result?.[0];
  if (!doc) {
    throw new ApiError(404, "Playlist not found");
  }

  const totalPages = Math.max(1, Math.ceil((doc.videosCount || 0) / limit));

  // ✅ return shape compatible with your frontend normalizePlaylistResponse
  const payload = {
    docs: [doc],
    page,
    limit,
    totalPages,
    totalDocs: doc.videosCount || 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Fetched playlist successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  const pid = toObjectId(playlistId, "playlistId");
  const vid = toObjectId(videoId, "videoId");

  const videoExists = await Video.exists({ _id: vid });
  if (!videoExists) throw new ApiError(404, "Video not found");

  const playList = await Playlist.findOneAndUpdate(
    { _id: pid, owner: req.user?._id },
    { $addToSet: { videos: vid } },
    { new: true }
  );

  if (!playList) throw new ApiError(404, "Playlist not found");

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Video is added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  const pid = toObjectId(playlistId, "playlistId");
  const vid = toObjectId(videoId, "videoId");

  const videoExists = await Video.exists({ _id: vid });
  if (!videoExists) throw new ApiError(404, "Video not found");

  const playList = await Playlist.findOneAndUpdate(
    { _id: pid, owner: req.user?._id },
    { $pull: { videos: vid } },
    { new: true }
  );

  if (!playList) throw new ApiError(404, "Playlist not found");

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Video is removed from playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const pid = toObjectId(playlistId, "playlistId");

  const deleted = await Playlist.deleteOne({
    _id: pid,
    owner: req.user?._id,
  });

  if (deleted.deletedCount === 0) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist is deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  const pid = toObjectId(playlistId, "playlistId");

  const playlist = await Playlist.findOneAndUpdate(
    { _id: pid, owner: req.user?._id },
    {
      $set: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    },
    { new: true }
  );

  if (!playlist) throw new ApiError(404, "Playlist not found");

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
