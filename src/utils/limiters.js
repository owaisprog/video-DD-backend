import { rateLimit } from "express-rate-limit";
import { ApiResponse } from "../utils/ApiResponse.js"; // adjust path

export const viewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 1, // 30 requests per minute per key
  standardHeaders: "draft-8", // RateLimit headers
  legacyHeaders: false,

  //  per-IP + per-video (prevents spamming one video)
  keyGenerator: (req) => `${req.ip}:${req.params.videoId}`,

  handler: (req, res) => {
    return res
      .status(429)
      .json(new ApiResponse(429, {}, "Too many requests, try again later"));
  },
});
