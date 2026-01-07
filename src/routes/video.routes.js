import { Router } from "express";

import upload from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controllers.js";
const router = Router();

router.route("/publish-video").post(
  verifyJwt,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishVideo
);
router.get("/get-all-videos", getAllVideos);
router.get("/get-video-by-Id/:videoId", getVideoById);
router.put(
  "/update-video/:videoId",
  verifyJwt,
  upload.single("video"),
  updateVideo
);
router.delete("/delete-video/:videoId", verifyJwt, deleteVideo);
router.put("/toggle-publish-status/:videoId", verifyJwt, togglePublishStatus);
export default router;
