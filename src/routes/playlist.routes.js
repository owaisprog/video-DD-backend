// src/routes/playlist.routes.js
import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controllers/playlist.controllers.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Playlists
 *   description: Playlist APIs (create, update, delete, add/remove videos, fetch playlists)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreatePlaylistBody:
 *       type: object
 *       required:
 *         - name
 *         - description
 *       properties:
 *         name:
 *           type: string
 *           example: My Favorite Videos
 *         description:
 *           type: string
 *           example: All my favorite content in one playlist
 *
 *     UpdatePlaylistBody:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Updated Playlist Name
 *         description:
 *           type: string
 *           example: Updated playlist description
 */

/**
 * @swagger
 * /api/v1/playlist/create-playlist:
 *   post:
 *     summary: Create a new playlist (requires JWT)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlaylistBody'
 *     responses:
 *       201:
 *         description: Playlist created successfully
 *       400:
 *         description: Validation error (name/description missing)
 *       401:
 *         description: Unauthorized
 */
router.route("/create-playlist").post(verifyJwt, createPlaylist);

/**
 * @swagger
 * /api/v1/playlist/get-user-playlists/user/{userId}/{page}/{limit}:
 *   get:
 *     summary: Get playlists of a user (requires JWT, only own userId allowed)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (must be current user's id)
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: path
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Fetched playlists successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (trying to fetch other user's playlists)
 *       400:
 *         description: Invalid userId/page/limit
 */
router
  .route("/get-user-playlists/user/:userId/:page/:limit")
  .get(verifyJwt, getUserPlaylists);

/**
 * @swagger
 * /api/v1/playlist/get-playlist-videos/{playlistId}/{page}/{limit}:
 *   get:
 *     summary: Get playlist by id with paginated videos (requires JWT, only owner)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: path
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Fetched playlist successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 *       400:
 *         description: Invalid playlistId/page/limit
 */
router
  .route("/get-playlist-videos/:playlistId/:page/:limit")
  .get(verifyJwt, getPlaylistById);

/**
 * @swagger
 * /api/v1/playlist/add-video-to-playlist/{playlistId}/add/{videoId}:
 *   patch:
 *     summary: Add a video to playlist (requires JWT, only owner)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video added to playlist successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist or Video not found
 *       400:
 *         description: Invalid playlistId/videoId
 */
router
  .route("/add-video-to-playlist/:playlistId/add/:videoId")
  .patch(verifyJwt, addVideoToPlaylist);

/**
 * @swagger
 * /api/v1/playlist/remove-video-from-playlist/{playlistId}/remove/{videoId}:
 *   patch:
 *     summary: Remove a video from playlist (requires JWT, only owner)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video removed from playlist successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist or Video not found
 *       400:
 *         description: Invalid playlistId/videoId
 */
router
  .route("/remove-video-from-playlist/:playlistId/remove/:videoId")
  .patch(verifyJwt, removeVideoFromPlaylist);

/**
 * @swagger
 * /api/v1/playlist/update-playlist/{playlistId}:
 *   patch:
 *     summary: Update playlist name/description (requires JWT, only owner)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePlaylistBody'
 *     responses:
 *       200:
 *         description: Playlist updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 *       400:
 *         description: Invalid playlistId
 */
router.route("/update-playlist/:playlistId").patch(verifyJwt, updatePlaylist);

/**
 * @swagger
 * /api/v1/playlist/delete-playlist/{playlistId}:
 *   delete:
 *     summary: Delete a playlist (requires JWT, only owner)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *     responses:
 *       200:
 *         description: Playlist deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 *       400:
 *         description: Invalid playlistId
 */
router.route("/delete-playlist/:playlistId").delete(verifyJwt, deletePlaylist);

export default router;
