import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const generateRefreshAccessToken = async (id) => {
  try {
    const user = await User.findById(id);
    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
  } catch (error) {
    throw new ApiError(400, "Error in create access or refresh token.");
  }
};

const options = {
  httpOnly: true, // ✅ was "http: true" (wrong)
  secure: process.env.NODE_ENV === "production", // ✅ don't break localhost
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  const fieldsArray = [
    { name: "username", value: username },
    { name: "email", value: email },
    { name: "fullname", value: fullname },
    { name: "password", value: password },
  ];

  for (const { name, value } of fieldsArray) {
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new ApiError(400, `${name} is required`);
    }
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists.");
  }

  let avatarLocalPath;
  if (req.files?.avatar) {
    avatarLocalPath = req.files?.avatar[0]?.path;
  }

  let coverImageLocalPath;
  if (req.files?.coverImage) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(409, "Avatar is required.");
  }

  const avatarUrl = await uploadFileOnCloudinary(avatarLocalPath);
  const coverImageUrl = coverImageLocalPath
    ? await uploadFileOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatarUrl) {
    throw new ApiError(409, "Avatar url is required.");
  }

  const createdUser = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    avatar: avatarUrl?.url,
    coverimage: coverImageUrl?.url || "",
    password,
  });

  const user = await User.findById(createdUser._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(400, "Some thing went wrong while creating user.");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, user, "User created successfully."));
});

export const loginUser = asyncHandler(async (req, res) => {
  // take username/email and password from req.body
  // check if username/email is present or not
  // if username/email is not present than return 404 error
  // compare password from database with bycrypt
  // if password is incorrect than return 400 error
  // if password is correct assign refresh and access to user
  // send cookie to user

  const { email, username, password } = req.body;

  if (!email && !username) {
    throw ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw ApiError(400, "User does not exist.");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid user credentials.");
  }

  const { refreshToken, accessToken } = await generateRefreshAccessToken(
    user._id
  );
  console.log(refreshAccessToken);
  console.log(accessToken);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: {
            refreshToken,
            accessToken,
            _id: user._id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
          },
        },
        "user loged in successfully."
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  const id = req.user?._id;

  await User.findByIdAndUpdate(
    id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    http: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logout successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  const token = incomingRefreshToken?.startsWith("Bearer ")
    ? incomingRefreshToken.split(" ")[1]
    : incomingRefreshToken;

  try {
    console.log(token);
    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (token !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { refreshToken, accessToken } = await generateRefreshAccessToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});
export const updatePassword = asyncHandler(async (req, res) => {
  const { password, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully."));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { username, fullname } = req.body;

  const user = await User.updateOne(
    req._id,
    {
      $set: {
        username,
        fullname,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const avatarPath = req.file?.path;
  if (!avatarPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const newAvatarUrl = await uploadFileOnCloudinary(avatarPath);

  if (!newAvatarUrl) {
    throw new ApiError(400, "Error in uploading avatar");
  }

  const user = await User.updateOne(
    req._id,
    {
      $set: {
        avatar: newAvatarUrl.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

export const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImagePath = req.file?.path;
  if (!coverImagePath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const newCoverImageUrl = await uploadFileOnCloudinary(coverImagePath);

  if (!newCoverImageUrl) {
    throw new ApiError(400, "Error in uploading cover image");
  }

  const user = await User.updateOne(
    req._id,
    {
      $set: {
        avatar: newCoverImageUrl.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image url updated successfully"));
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId.trim()) {
    throw new ApiError(400, "channelId is reequired.");
  }

  const profileData = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullname: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!profileData?.length) {
    throw new ApiError(404, "profileData does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        profileData[0],
        "User profileData fetched successfully"
      )
    );
});

export const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
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
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
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
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});
