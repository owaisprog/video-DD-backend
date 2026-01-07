import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "chanelId is required");
  }

  if (!isValidObjectId(channelId)) {
    {
      throw new ApiError(400, "Invalid channelId");
    }
  }

  const userexists = await User.findById(channelId);

  if (!userexists) {
    throw new ApiResponse(200, "Channel doesn't exist");
  }

  const subscription = await Subscription.create({
    subscriberId: req.user._id,
    channelId: channelId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscription, "Channel subscribed successfully")
    );
});

// controller to return subscriber list of a channel
export const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "chanelId is required");
  }

  if (!isValidObjectId(channelId)) {
    {
      throw new ApiError(400, "Invalid channelId");
    }
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channelId: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "User",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Successfully fetched all subscribers")
    );
});

// controller to return channel list to which user has subscribed
export const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId) {
    throw new ApiError(400, "chanelId is required");
  }

  if (!isValidObjectId(subscriberId)) {
    {
      throw new ApiError(400, "Invalid channelId");
    }
  }

  const subscriberChannel = await Subscription.aggregate([
    {
      $match: {
        channelId: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "User",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriberChannel,
        "Successfully fetched all subscriber channel"
      )
    );
});
