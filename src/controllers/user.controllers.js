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

const registerUser = asyncHandler(async (req, res) => {
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

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(409, "Avatar is required.");
  }

  console.log("avatarLocalPath", avatarLocalPath);
  const avatarUrl = await uploadFileOnCloudinary(avatarLocalPath);
  const coverImageUrl = await uploadFileOnCloudinary(coverImageLocalPath);

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

const loginUser = asyncHandler(async (req, res) => {
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

  const options = {
    http: true,
    secure: true,
  };

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

const logoutUser = asyncHandler(async (req, res) => {
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
  const reqAccessToken = req.cookie.accessToken || req.body.accessToken;

  if (!reqAccessToken) {
    throw new ApiError(401, "Unauthorized request.");
  }

  const decodedAccessToken = jwt.verify(
    refreshAccessToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const findUser = await User.findById(decodedAccessToken._id);
  if (!findUser) {
    throw new ApiError(401, "Invalid refresh token.");
  }

  if (decodedAccessToken !== findUser._id) {
    throw new Error(401, "Refresh token is expired.");
  }

  const options = {
    http: true,
    secure: true,
  };

  const { accessToken, newRefreshToken } = await generateRefreshAccessToken(
    findUser._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refreshed."
      )
    );
});

const updatePassword = asyncHandler(async (req, res) => {
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

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
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

const updateAvatar = asyncHandler(async (req, res) => {
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

const updateCoverImage = asyncHandler(async (req, res) => {
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

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username.trim()) {
    throw new Error(400, "username is reequired.");
  }

  const profileData = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase,
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

const getUserWatchHistory = asyncHandler(async (req, res) => {
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

export {
  registerUser,
  loginUser,
  logoutUser,
  updatePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
};
