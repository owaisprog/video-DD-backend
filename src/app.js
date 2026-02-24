// src/app.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";

import userRoutes from "./routes/user.routes.js";
import videoRoutes from "./routes/video.routes.js";
import likeRoutes from "./routes/likes.routes.js";
import postRoutes from "./routes/post.routes.js";
import commentRoutes from "./routes/comments.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import watchHistoryRoutes from "./routes/watchHistory.routes.js";
import playListRoutes from "./routes/playlist.routes.js";
import geminiChatRoutes from "./routes/geminiChat.route.js";

import { connectToDatabase } from "./config/db/config.js";

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Ensure DB is connected before hitting routes
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/health", (_, res) => res.send("Health is good"));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/video", videoRoutes);
app.use("/api/v1/like", likeRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);
app.use("/api/v1/post", postRoutes);
app.use("/api/v1/comment", commentRoutes);
app.use("/api/v1/watch-history", watchHistoryRoutes);
app.use("/api/v1/playlist", playListRoutes);
app.use("/api/v1/gemini-chat", geminiChatRoutes);

// Central error handler (shows real DB errors in Vercel logs)
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(500)
    .json({ success: false, message: err.message || "Server Error" });
});

export default app;
