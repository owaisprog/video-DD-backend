import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comments.controllers.js";

const router = Router();

router
  .route("/video/:videoId")
  .get(getVideoComments)
  .post(verifyJwt, addComment);

router
  .route("/:commentId")
  .patch(verifyJwt, updateComment)
  .delete(verifyJwt, deleteComment);

export default router;
