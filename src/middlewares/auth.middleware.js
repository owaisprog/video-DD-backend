import redis from "../config/redisConfig.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
export const verifyJwt = asyncHandler(async (req, res, next) => {
  const accessToken =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!accessToken) {
    throw new ApiError(401, "Please login first.");
  }

  try {
    const decodedAccessToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    if (!decodedAccessToken.jti) {
      throw new ApiError(401, "Invalid token structure.");
    }

    // 🔥 Check blacklist
    const isBlacklisted = await redis.exists(`bl:${decodedAccessToken.jti}`);

    if (isBlacklisted) {
      throw new ApiError(401, "Token revoked. Please login again.");
    }

    // ✅ Cache per user
    const cacheKey = `user:${decodedAccessToken._id}`;

    const cachedUserData = await redis.get(cacheKey);

    if (cachedUserData) {
      req.user = JSON.parse(cachedUserData);
      return next(); // IMPORTANT
    }

    // Fetch from DB
    const user = await User.findById(decodedAccessToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token.");
    }

    // Store in Redis
    await redis.set(cacheKey, JSON.stringify(user), "EX", 300);

    req.user = user;
    return next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token.");
  }
});
