import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

import {
  deleteVideo,
  getAllVideos,
  getMyAllVideos,
  getSuggestedVideos,
  getVideoById,
  publishVideo,
  togglePublishStatus,
  updateVideo,
  updateVideoMetaData,
  updateVideoThumbnail,
  videoViewIncrement,
} from "../controllers/video.controllers.js";

import { viewLimiter } from "../utils/limiters.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Videos
 *   description: Video APIs (publish, list, update, delete, suggested, views)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PublishVideoBody:
 *       type: object
 *       required:
 *         - title
 *         - description
 *       properties:
 *         title:
 *           type: string
 *           example: My first video
 *         description:
 *           type: string
 *           example: This is my first upload on this platform.
 *         isPublished:
 *           type: string
 *           example: "true"
 *           description: "Send as string: 'true' or 'false' (as your controller expects)"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["coding", "javascript"]
 *
 *     UpdateVideoMetaBody:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: Updated title
 *         description:
 *           type: string
 *           example: Updated description
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["nodejs", "backend"]
 */

/**
 * @swagger
 * /api/v1/video/publish-video:
 *   post:
 *     summary: Publish a new video (multipart/form-data) (requires JWT)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/PublishVideoBody'
 *               - type: object
 *                 properties:
 *                   video:
 *                     type: string
 *                     format: binary
 *                   thumbnail:
 *                     type: string
 *                     format: binary
 *     responses:
 *       201:
 *         description: Video published successfully
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Validation error (title/description/video/thumbnail missing)
 */
router.route("/publish-video").post(
  verifyJwt,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishVideo
);

/**
 * @swagger
 * /api/v1/video/get-all-videos:
 *   get:
 *     summary: Get all videos (public) with pagination + search
 *     tags: [Videos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *           example: naruto
 *         description: Search in title/description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt
 *       - in: query
 *         name: sortType
 *         schema:
 *           type: string
 *           example: desc
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by owner userId (optional)
 *     responses:
 *       200:
 *         description: Video data fetched successfully
 */
router.get("/get-all-videos", getAllVideos);

/**
 * @swagger
 * /api/v1/video/get-my-all-videos:
 *   get:
 *     summary: Get my videos (requires JWT) with pagination + search
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *           example: tutorial
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt
 *       - in: query
 *         name: sortType
 *         schema:
 *           type: string
 *           example: desc
 *     responses:
 *       200:
 *         description: My video list fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/get-my-all-videos", verifyJwt, getMyAllVideos);

/**
 * @swagger
 * /api/v1/video/get-video-by-Id/{videoId}:
 *   get:
 *     summary: Get video by id (public)
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video fetched successfully
 */
router.get("/get-video-by-Id/:videoId", getVideoById);

/**
 * @swagger
 * /api/v1/video/update-video/{videoId}:
 *   put:
 *     summary: Update video file (multipart/form-data) (requires JWT)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Video updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video not found
 */
router.put(
  "/update-video/:videoId",
  verifyJwt,
  upload.single("video"),
  updateVideo
);

/**
 * @swagger
 * /api/v1/video/delete-video/{videoId}:
 *   delete:
 *     summary: Delete a video (requires JWT)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video not found
 */
router.delete("/delete-video/:videoId", verifyJwt, deleteVideo);

/**
 * @swagger
 * /api/v1/video/toggle-publish-status/{videoId}:
 *   put:
 *     summary: Toggle publish/unpublish a video (requires JWT)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Publish status toggled successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Video not found / bad request
 */
router.put("/toggle-publish-status/:videoId", verifyJwt, togglePublishStatus);

/**
 * @swagger
 * /api/v1/video/edit-video-data/{videoId}:
 *   patch:
 *     summary: Update video metadata (title/description/tags) (requires JWT)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVideoMetaBody'
 *     responses:
 *       200:
 *         description: Video metadata updated successfully
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: videoId is required
 */
router.patch("/edit-video-data/:videoId", verifyJwt, updateVideoMetaData);

/**
 * @swagger
 * /api/v1/video/edit-video-thumbnail/{videoId}:
 *   put:
 *     summary: Update video thumbnail (multipart/form-data) (requires JWT)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Thumbnail updated successfully
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: videoId is required
 */
router.put(
  "/edit-video-thumbnail/:videoId",
  verifyJwt,
  upload.single("thumbnail"),
  updateVideoThumbnail
);

/**
 * @swagger
 * /api/v1/video/get-suggested-videos/{videoId}:
 *   get:
 *     summary: Get suggested videos for a given videoId (public)
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *     responses:
 *       200:
 *         description: Suggested videos fetched successfully
 *       400:
 *         description: Invalid videoId
 *       404:
 *         description: Video not found
 */
router.get("/get-suggested-videos/:videoId", getSuggestedVideos);

/**
 * @swagger
 * /api/v1/video/increment-video-view/{videoId}:
 *   get:
 *     summary: Increment video view count (rate limited)
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: View incremented successfully
 *       400:
 *         description: Invalid videoId
 *       404:
 *         description: Video not found
 *       429:
 *         description: Too many requests (rate limited)
 */
router.get("/increment-video-view/:videoId", viewLimiter, videoViewIncrement);

export default router;
