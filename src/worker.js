// src/worker.js
import "dotenv/config";
import bullmqWorkerRedis from "./config/bullmqWorkerRedis.js";
import { connectToDatabase } from "./config/dbConfig.js";
import { startVideoWorker } from "./workers/video.worker.js";

let workerInstance = null;

const start = async () => {
  await connectToDatabase();
  console.log("Mongo connected");

  await bullmqWorkerRedis.ping();
  console.log("BullMQ Redis ping OK");

  workerInstance = startVideoWorker();
  console.log("Worker is running");

  workerInstance.on("ready", () => {
    console.log("BullMQ worker is ready");
  });

  workerInstance.on("completed", (job) => {
    console.log(`Job completed: ${job.id}`);
  });

  workerInstance.on("failed", (job, err) => {
    console.error(`Job failed: ${job?.id}`, err?.message || err);
  });

  workerInstance.on("error", (err) => {
    console.error("Worker error:", err);
  });
};

start().catch((error) => {
  console.error("Worker startup failed:", error);
  process.exit(1);
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down worker...`);

  try {
    if (workerInstance) {
      await workerInstance.close();
      console.log("Worker closed");
    }

    await bullmqWorkerRedis.quit();
    console.log("Redis connection closed");

    process.exit(0);
  } catch (error) {
    console.error("Shutdown failed:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
