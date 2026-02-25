// src/server.js
import "dotenv/config";
import app from "./app.js";
import redis from "./config/redisConfig.js";
import { connectToDatabase } from "./config/dbConfig.js";

const port = process.env.PORT || 4000;

app.listen(port, async () => {
  await connectToDatabase();

  const rediss = await redis.ping();
  console.log("Redis ping OK", rediss);

  console.log(`Server is running on PORT:${port}`);
});
