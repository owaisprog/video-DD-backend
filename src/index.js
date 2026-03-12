// src/index.js
import "dotenv/config";
import app from "./app.js";

import { connectToDatabase } from "./config/dbConfig.js";

const port = process.env.PORT || 4000;

const start = async () => {
  try {
    await connectToDatabase();
    console.log("Mongo connected");

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server is running on PORT:${port}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
};

start();
