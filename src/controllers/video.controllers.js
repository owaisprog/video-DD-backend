import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

export const publishVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished, tags } = req.body;

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
  let IsPublished;

  if (isPublished && isPublished === "true") {
    IsPublished = true;
  } else if (isPublished && isPublished === "false") {
    IsPublished = false;
  }

  const video = await Video.create({
    thumbnail: cloudinarythumbnail.url,
    title,
    description,
    isPublished: IsPublished,
    videoFile: cloudinaryVideo.url,
    duration: cloudinaryVideo.duration,
    owner: req.user?._id,
    tags,
  });

  console.log("fieldsArray", fieldsArray);
  console.log("videoPath", videoPath);
  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video publish successfully"));
});

export const getMyAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit, query, sortBy, sortType } = req.query;

  page = Number(page);
  limit = Number(limit);

  const options = {
    page,
    limit,
  };

  let match = {};

  match.owner = new mongoose.Types.ObjectId(req?.user._id);

  if (query) {
    match.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  // match.count = {};

  const sort = { [sortType]: sortBy === "asc" ? -1 : 1, _id: 1 };

  const aggregate = Video.aggregate([
    {
      $match: match,
    },
    {
      $sort: sort,
    },
    {
      $lookup: {
        from: "likes",
        foreignField: "video",
        localField: "_id",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        foreignField: "video",
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
    {
      $project: { likes: 0, comments: 0 },
    },
  ]);

  const videos = await Video.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Video data fetched successfully"));
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

  // match.count = {};

  const sort = { [sortType]: sortBy === "asc" ? -1 : 1, _id: 1 };

  const aggregate = Video.aggregate([
    {
      $match: match,
    },
    {
      $sort: sort,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $lookup: {
        from: "likes",
        foreignField: "video",
        localField: "_id",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        foreignField: "video",
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
    {
      $project: { likes: 0, comments: 0 },
    },
  ]);

  const videos = await Video.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Video data fetched successfully"));
});

export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(videoId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $lookup: {
        from: "likes",
        foreignField: "video",
        localField: "_id",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        foreignField: "video",
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
    {
      $project: { likes: 0, comments: 0 },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video data fetched successfully"));
});

export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  console.log(":::::::::::::::::: update video");
  const video = req.file.path;
  if (!video) {
    throw new Error(409, "Video is required");
  }

  const cloudinaryVideo = await uploadFileOnCloudinary(video);

  if (!cloudinaryVideo) {
    throw new ApiError(409, "Video url is required");
  }
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        videoFile: cloudinaryVideo.url,
      },
    },
    { new: true }
  );

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

export const updateVideoMetaData = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, tags } = req.body;

  if (!videoId) {
    throw new ApiError(409, "videoId is required");
  }

  const updatedData = await Video.findByIdAndUpdate(
    {
      _id: videoId,
      owner: req.user?._id,
    },
    {
      $set: {
        title,
        description,
        tags,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Video data updated successfuly", updatedData));
});

export const updateVideoThumbnail = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const thumbnail = req.file?.path;

  if (!videoId) {
    throw new ApiError(409, "videoId is required");
  }

  const cloudinaryThumbnail = await uploadFileOnCloudinary(thumbnail);

  if (!cloudinaryThumbnail) {
    throw new ApiError(409, "thumbnail url is required");
  }
  const updatedData = await Video.findByIdAndUpdate(
    {
      _id: videoId,
      owner: req.user?._id,
    },
    {
      $set: {
        thumbnail: cloudinaryThumbnail.url,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Video data updated successfuly", updatedData));
});

const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTags = (tags = []) => [
  ...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)),
];

const tokenizeTags = (tags = []) => {
  const tokens = [];
  for (const t of tags) {
    const words = String(t)
      .toLowerCase()
      .trim()
      .split(/[\s,._-]+/g) // split by spaces/punct
      .filter((w) => w.length >= 2);
    tokens.push(...words);
  }
  return [...new Set(tokens)];
};

export const getSuggestedVideos = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "20", 10), 1),
    50
  );

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const seed = await Video.findById(videoId).select("_id tags isPublished");
  if (!seed) throw new ApiError(404, "Video not found");

  const seedTags = normalizeTags(seed.tags);
  const seedTokens = tokenizeTags(seedTags);
  const tokenPatterns = seedTokens.map((tok) => `\\b${escapeRegex(tok)}\\b`);

  const options = { page, limit };

  // A pool bigger than limit so pagination + de-dupe still returns enough
  const pool = Math.min(400, limit * 10);

  const baseMatch = {
    _id: { $ne: seed._id },
    isPublished: true,
  };

  // If seed has no usable tags/tokens -> random fallback
  if (seedTags.length === 0 || seedTokens.length === 0) {
    const aggregate = Video.aggregate([
      { $match: baseMatch },
      { $sample: { size: pool } },
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
          title: 1,
          tags: 1,
          thumbnail: 1,
          owner: 1,
          createdAt: 1,
          views: 1,
          isPublished: 1,
        },
      },
    ]);

    const suggested = await Video.aggregatePaginate(aggregate, options);

    return res
      .status(200)
      .json(
        new ApiResponse(200, suggested, "Suggested videos fetched successfully")
      );
  }

  const pipeline = [
    {
      $facet: {
        // 1) MATCHED: strong relevance candidates
        matched: [
          {
            $match: {
              ...baseMatch,
              // quick pre-filter (exact matches)
              $or: [{ tags: { $in: seedTags } }, { tags: { $in: seedTokens } }],
            },
          },

          // score by partial/word match so "gojo" matches "gojo saturu"
          {
            $addFields: {
              matchCount: {
                $size: {
                  $filter: {
                    input: tokenPatterns, // ["\\bgojo\\b", ...]
                    as: "pat",
                    cond: {
                      $anyElementTrue: {
                        $map: {
                          input: "$tags",
                          as: "t",
                          in: {
                            $regexMatch: {
                              input: {
                                $toLower: { $trim: { input: "$$t" } },
                              },
                              regex: "$$pat",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },

          { $match: { matchCount: { $gt: 0 } } },
          { $sort: { matchCount: -1, createdAt: -1, _id: 1 } },
          { $limit: pool },
        ],

        // 2) FILLER: random videos to fill remaining slots
        filler: [{ $match: baseMatch }, { $sample: { size: pool } }],
      },
    },

    // matched first, then filler
    { $project: { combined: { $concatArrays: ["$matched", "$filler"] } } },

    // unwind with index so we can keep "matched first" order
    { $unwind: { path: "$combined", includeArrayIndex: "idx" } },

    // move combined doc to root and keep idx
    {
      $replaceRoot: {
        newRoot: { $mergeObjects: ["$combined", { idx: "$idx" }] },
      },
    },

    // de-dupe (matched wins because it appears first in combined)
    {
      $group: {
        _id: "$_id",
        doc: { $first: "$$ROOT" },
        idx: { $min: "$idx" },
      },
    },
    { $replaceRoot: { newRoot: "$doc" } },

    // restore order: matched first then filler
    { $sort: { idx: 1 } },

    // remove idx cleanly (don't mix include/exclude in $project)
    { $unset: "idx" },

    // populate owner(s)
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },

    // output shape (pure inclusion projection)
    {
      $project: {
        title: 1,
        tags: 1,
        thumbnail: 1,
        owner: 1,
        createdAt: 1,
        views: 1,
        isPublished: 1,
        matchCount: 1, // exists for matched items; undefined for filler
      },
    },
  ];

  const aggregate = Video.aggregate(pipeline);
  const suggestedVideos = await Video.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        suggestedVideos,
        "Suggested videos fetched successfully"
      )
    );
});

export const videoViewIncrement = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new ApiError(400, "videoId is required");

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const updated = await Video.findByIdAndUpdate(
    videoId,
    { $inc: { views: 1 } },
    { new: true }
  ).select("views");

  if (!updated) throw new ApiError(404, "Video not found");

  return res
    .status(200)
    .json(new ApiResponse(200, { views: updated.views }, "View incremented"));
});
