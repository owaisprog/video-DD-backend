import redis from "../config/redisConfig.js";

export const rateLimit = (limit, seconds, keyPrefix) => {
  return async (req, res, next) => {
    const id = req.user?._id?.toString() || req.ip;
    const key = `${keyPrefix}:${id}`;

    // increase count
    const count = await redis.incr(key);

    // first time => set expiry
    if (count === 1) {
      await redis.expire(key, seconds);
    }

    // too many requests
    if (count > limit) {
      return res.status(429).json({ message: "Too many requests, try later." });
    }

    next();
  };
};
