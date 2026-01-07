import { Router } from "express";

import { verifyJwt } from "../middlewares/auth.middleware.js";

import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comments.controllers.js";
const router = Router();

router.route("/get-video-comment/:videoId").get(getVideoComments);
router.route("/get-video-comment/:videoId").get(verifyJwt, addComment);
router.route("/get-video-comment/:videoId").get(verifyJwt, updateComment);
router.route("/get-video-comment/:videoId").get(verifyJwt, deleteComment);

export default router;
