// src/worker.js

import "dotenv/config";
import redis from "./config/redisConfig.js";
import bullmqWorkerRedis from "./config/bullmqWorkerRedis.js";
import "./workers/video.worker.js";

const start = async () => {
  await redis.ping();
  console.log("Redis ping OK");

  await bullmqWorkerRedis.ping();
  console.log("BullMQ Redis ping OK");

  console.log("Worker is running");
};

start().catch((error) => {
  console.error("Worker startup failed:", error);
  process.exit(1);
});
