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

router.route("/create-playlist").post(verifyJwt, createPlaylist);
router
  .route("/get-user-playlists/user/:userId/:page/:limit")
  .get(verifyJwt, getUserPlaylists);
router
  .route("/get-playlist-videos/:playlistId/:page/:limit")
  .get(verifyJwt, getPlaylistById);

router
  .route("/add-video-to-playlist/:playlistId/add/:videoId")
  .patch(verifyJwt, addVideoToPlaylist);
router
  .route("/remove-video-from-playlist/:playlistId/remove/:videoId")
  .patch(verifyJwt, removeVideoFromPlaylist);

router.route("/update-playlist/:playlistId").patch(verifyJwt, updatePlaylist);
router.route("/delete-playlist/:playlistId").delete(verifyJwt, deletePlaylist);

export default router;
