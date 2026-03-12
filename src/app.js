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
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";
import { videoProcessingQueue } from "./queues/video.queue.js";

//  Add Bull Board
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/arena");

createBullBoard({
  queues: [new BullMQAdapter(videoProcessingQueue)],
  serverAdapter,
});

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/arena", serverAdapter.getRouter());

// Logging & body parsing
app.use(morgan("dev"));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Health check
app.get("/health", (_, res) => res.send("Health is good"));

// API routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/video", videoRoutes);
app.use("/api/v1/like", likeRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);
app.use("/api/v1/post", postRoutes);
app.use("/api/v1/comment", commentRoutes);
app.use("/api/v1/watch-history", watchHistoryRoutes);
app.use("/api/v1/playlist", playListRoutes);
app.use("/api/v1/gemini-chat", geminiChatRoutes);

// Central error handler
app.use(async (err, req, res, next) => {
  console.error(err);
  res
    .status(500)
    .json({ success: false, message: err.message || "Server Error" });
});

export default app;
