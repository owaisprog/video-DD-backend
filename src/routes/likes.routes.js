import { Router } from "express";

import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  getLikedVideos,
  toggleVideoLike,
} from "../controllers/likes.controllers.js";
const router = Router();

router.route("/by-video/:videoId").patch(verifyJwt, toggleVideoLike);
router.route("/all-videos").get(verifyJwt, getLikedVideos);

export default router;
