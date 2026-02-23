const Redis = require("ioredis");
export const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (e: any) => console.error("❌ Redis error", e));

export default redis;
