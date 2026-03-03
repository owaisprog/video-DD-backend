// queues/video.queue.js
import { Queue } from "bullmq";
import redis from "../config/redisConfig.js";

export const videoProcessingQueue = new Queue("videoProcessing", {
  connection: redis,
});
