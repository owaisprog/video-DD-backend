import { Router } from "express";

import upload from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
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

router.route("/publish-video").post(
  verifyJwt,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishVideo
);
router.get("/get-all-videos", getAllVideos);
router.get("/get-my-all-videos", verifyJwt, getMyAllVideos);
router.get("/get-video-by-Id/:videoId", getVideoById);
router.put(
  "/update-video/:videoId",
  verifyJwt,
  upload.single("video"),
  updateVideo
);
router.delete("/delete-video/:videoId", verifyJwt, deleteVideo);
router.put("/toggle-publish-status/:videoId", verifyJwt, togglePublishStatus);
router.patch("/edit-video-data/:videoId", verifyJwt, updateVideoMetaData);

router.put(
  "/edit-video-thumbnail/:videoId",
  verifyJwt,
  upload.single("thumbnail"),
  updateVideoThumbnail
);

router.get("/get-suggested-videos/:videoId", getSuggestedVideos);
router.get("/increment-video-view/:videoId", viewLimiter, videoViewIncrement);
export default router;
