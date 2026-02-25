import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  getLikedVideos,
  toggleVideoLike,
} from "../controllers/likes.controllers.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Like APIs (toggle like on video + get liked videos)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ToggleLikeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Like created successfully
 *         data:
 *           type: object
 *           properties:
 *             liked:
 *               type: boolean
 *               example: true
 *
 *     LikedVideosResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: All Liked videos
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 example: 65f2c1a2d3e4f567890ab111
 *               video:
 *                 type: array
 *                 description: Video object from aggregation (array because lookup result)
 *                 items:
 *                   type: object
 */

/**
 * @swagger
 * /api/v1/like/by-video/{videoId}:
 *   patch:
 *     summary: Toggle like/unlike on a video (requires JWT)
 *     tags: [Likes]
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
 *         description: Like toggled successfully (liked true/false)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ToggleLikeResponse'
 *       400:
 *         description: Invalid or missing videoId
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video not found
 */
router.route("/by-video/:videoId").patch(verifyJwt, toggleVideoLike);

/**
 * @swagger
 * /api/v1/like/all-videos:
 *   get:
 *     summary: Get all videos liked by current user (requires JWT)
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liked videos fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LikedVideosResponse'
 *       401:
 *         description: Unauthorized
 */
router.route("/all-videos").get(verifyJwt, getLikedVideos);

export default router;
