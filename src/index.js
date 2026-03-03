// src/server.js
import "dotenv/config";
import app from "./app.js";
import redis from "./config/redisConfig.js";
import { connectToDatabase } from "./config/dbConfig.js";
import bullmqWorkerRedis from "./config/bullmqWorkerRedis.js";

const port = process.env.PORT || 4000;

app.listen(port, async () => {
  await connectToDatabase();

  const rediss = await redis.ping();
  console.log("Redis ping OK", rediss);
  const workerPing = await bullmqWorkerRedis.ping();
  console.log("BullMQ Redis ping OK", workerPing);

  console.log(`Server is running on PORT:${port}`);
});
