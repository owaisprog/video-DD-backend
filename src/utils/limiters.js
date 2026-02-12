import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { ApiResponse } from "../utils/ApiResponse.js";

export const viewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 1, // NOTE: this is 1 request/minute (your comment said 30)
  standardHeaders: "draft-8",
  legacyHeaders: false,

  // per-IP + per-video (IPv6-safe)
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip); // ✅ fixes ERR_ERL_KEY_GEN_IPV6
    const videoId = req.params?.videoId ?? "no-video-id";
    return `${ipKey}:${videoId}`;
  },

  handler: (req, res) => {
    return res
      .status(429)
      .json(new ApiResponse(429, {}, "Too many requests, try again later"));
  },
});
