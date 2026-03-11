// src/index.js or src/server.js
import "dotenv/config";
import app from "./app.js";
import redis from "./config/redisConfig.js";
import { connectToDatabase } from "./config/dbConfig.js";
import bullmqWorkerRedis from "./config/bullmqWorkerRedis.js";

const port = process.env.PORT || 4000;

const start = async () => {
  try {
    await connectToDatabase();
    console.log("Mongo connected");

    await redis.ping();
    console.log("Redis ping OK");

    await bullmqWorkerRedis.ping();
    console.log("BullMQ Redis ping OK");

    app.listen(port, () => {
      console.log(`Server is running on PORT:${port}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
};

start();
