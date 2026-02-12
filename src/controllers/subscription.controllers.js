import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Toggle subscription for logged in user to a channel
 * route: POST/GET whatever you use -> /subscriptions/toggle/:channelId
 */
export const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  if (!channelId) throw new ApiError(400, "channelId is required");
  if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channelId");

  // prevent subscribing to yourself
  if (String(channelId) === String(req.user._id)) {
    throw new ApiError(400, "You can't subscribe to your own channel");
  }

  // confirm channel exists
  const channelExists = await User.findById(channelId).select("_id");
  if (!channelExists) throw new ApiError(404, "Channel doesn't exist");

  // ✅ delete if already subscribed
  const deleted = await Subscription.findOneAndDelete({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (deleted) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subscribed: false },
          "Channel unsubscribed successfully"
        )
      );
  }

  // ✅ otherwise create subscription
  try {
    const subscription = await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subscribed: true, subscription },
          "Channel subscribed successfully"
        )
      );
  } catch (err) {
    // handle duplicate race condition
    if (err?.code === 11000) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { subscribed: true },
            "Channel already subscribed"
          )
        );
    }
    throw err;
  }
});

/**
 * Get subscribers of a channel
 * route: GET /subscriptions/channel/:channelId/subscribers
 */
export const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) throw new ApiError(400, "channelId is required");
  if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channelId");

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId), // ✅ correct field
      },
    },
    {
      $lookup: {
        from: "users", // ✅ correct collection name (most likely)
        localField: "subscriber", // ✅ correct field
        foreignField: "_id",
        as: "subscriber",
        pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
      },
    },
    { $unwind: "$subscriber" },
    {
      $project: {
        _id: 1,
        subscriber: 1,
        channel: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Successfully fetched all subscribers")
    );
});

/**
 * Get channels that a user subscribed to
 * route: GET /subscriptions/user/:subscriberId/channels
 */
export const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId) throw new ApiError(400, "subscriberId is required");
  if (!isValidObjectId(subscriberId))
    throw new ApiError(400, "Invalid subscriberId");

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId), // ✅ correct field
      },
    },
    {
      $lookup: {
        from: "users", // ✅ correct collection
        localField: "channel", // ✅ correct field
        foreignField: "_id",
        as: "channel",
        pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
      },
    },
    { $unwind: "$channel" },
    {
      $project: {
        _id: 1,
        subscriber: 1,
        channel: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Successfully fetched subscribed channels"
      )
    );
});
