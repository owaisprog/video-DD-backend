import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addToWatchHistory,
  clearWatchHistory,
  getWatchHistory,
  removeFromWatchHistory,
} from "../controllers/watchHistory.controllers.js";
import { rateLimit } from "../middlewares/rate-limiter.js";

const router = Router();
router.use(verifyJwt);

/**
 * @swagger
 * tags:
 *   name: WatchHistory
 *   description: Watch history APIs (add, list, remove, clear)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AddToWatchHistoryBody:
 *       type: object
 *       properties:
 *         videoId:
 *           type: string
 *           example: 65f2c1a2d3e4f567890abc12
 *       description: Optional because your controller supports both params.videoId and body.videoId
 */

/**
 * @swagger
 * /api/v1/watch-history/add-to-watch-history/{videoId}:
 *   post:
 *     summary: Add a video to watch history (requires JWT)
 *     tags: [WatchHistory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToWatchHistoryBody'
 *     responses:
 *       201:
 *         description: Video added to watch history
 *       400:
 *         description: Video ID is required
 *       401:
 *         description: Unauthorized
 */
router
  .route("/add-to-watch-history/:videoId")
  .post(rateLimit(30, 60, "rl:watchHistory:add"), addToWatchHistory);

/**
 * @swagger
 * /api/v1/watch-history/get-watch-history:
 *   get:
 *     summary: Get watch history (requires JWT) with pagination
 *     tags: [WatchHistory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: updatedAt
 *         description: Sort field (your code uses sortBy/sortType)
 *       - in: query
 *         name: sortType
 *         schema:
 *           type: string
 *           example: desc
 *         description: Sort direction (asc/desc)
 *     responses:
 *       200:
 *         description: Watch history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router
  .route("/get-watch-history")
  .get(rateLimit(60, 60, "rl:watchHistory:get"), getWatchHistory);

/**
 * @swagger
 * /api/v1/watch-history/remove-from-watch-history/{videoId}:
 *   delete:
 *     summary: Remove a video from watch history (requires JWT)
 *     tags: [WatchHistory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video removed from watch history
 *       400:
 *         description: Video ID is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Watch history entry not found
 */
router
  .route("/remove-from-watch-history/:videoId")
  .delete(rateLimit(30, 60, "rl:watchHistory:remove"), removeFromWatchHistory);

/**
 * @swagger
 * /api/v1/watch-history/clear-watch-history:
 *   delete:
 *     summary: Clear entire watch history (requires JWT)
 *     tags: [WatchHistory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watch history cleared successfully
 *       401:
 *         description: Unauthorized
 */
router
  .route("/clear-watch-history")
  .delete(rateLimit(5, 60, "rl:watchHistory:clear"), clearWatchHistory);

export default router;
