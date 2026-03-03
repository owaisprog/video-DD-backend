import Redis from "ioredis";

const bullmqWorkerRedis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME || "default",
  password: process.env.REDIS_PASSWORD,

  //    MUST for BullMQ workers
  maxRetriesPerRequest: null,

  retryStrategy: (times) => Math.min(times * 100, 2000),
});

bullmqWorkerRedis.on("connect", () =>
  console.log("BullMQ Worker Redis connected")
);
bullmqWorkerRedis.on("error", (err) =>
  console.error("BullMQ Worker Redis error:", err)
);

export default bullmqWorkerRedis;
