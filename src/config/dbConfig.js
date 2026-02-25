// src/config/db/config.js
import mongoose from "mongoose";

const URI = process.env.MONGOOSE_URI || process.env.MONGODB_URI;
if (!URI) throw new Error("Missing MONGOOSE_URI (or MONGODB_URI)");

// Fail fast instead of buffering queries for 10s
mongoose.set("bufferCommands", false);

const g = globalThis;
g.__mongoose ??= { conn: null, promise: null };

export async function connectToDatabase() {
  // If already connected in this runtime, reuse it
  if (g.__mongoose.conn && mongoose.connection.readyState === 1) {
    return g.__mongoose.conn;
  }

  // Create (or reuse) the in-flight connection promise
  if (!g.__mongoose.promise) {
    g.__mongoose.promise = mongoose
      .connect(URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => m)
      .catch((err) => {
        // allow retry on next request
        g.__mongoose.promise = null;
        throw err;
      });
  }

  g.__mongoose.conn = await g.__mongoose.promise;
  return g.__mongoose.conn;
}
