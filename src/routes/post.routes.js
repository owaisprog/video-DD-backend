import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

import {
  createPost,
  deletePost,
  getUserPosts,
  updatePost,
} from "../controllers/post.controllers.js";

const router = Router();

// public feed (all posts) OR user posts via query ?userId=...
router.route("/get-user-posts").get(getUserPosts);

router.route("/create-post").post(verifyJwt, createPost);

// ✅ postId is in params
router.route("/update-post/:postId").put(verifyJwt, updatePost);
router.route("/delete-post/:postId").delete(verifyJwt, deletePost);

export default router;
