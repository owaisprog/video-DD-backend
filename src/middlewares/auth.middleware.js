import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
export const verifyJwt = asyncHandler(async (req, res, next) => {
  const accessToken =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  // ✅ token missing => proper message
  if (!accessToken) {
    throw new ApiError(401, "Please login first.");
  }

  try {
    const decodedAccessToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedAccessToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token.");
    }

    req.user = user;
    next();
  } catch (error) {
    // ✅ keep ApiError message as-is
    if (error instanceof ApiError) throw error;

    // ✅ fix typo: message
    throw new ApiError(401, error?.message || "Invalid Access Token.");
  }
});
