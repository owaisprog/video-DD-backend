import { Router } from "express";

import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addToWatchHistory,
  clearWatchHistory,
  getWatchHistory,
  removeFromWatchHistory,
} from "../controllers/watchHistory.controllers.js";

const router = Router();

// ✅ Keep your existing route names
router
  .route("/add-to-watch-history/:videoId")
  .post(verifyJwt, addToWatchHistory);

router.route("/get-watch-history").get(verifyJwt, getWatchHistory);

router
  .route("/remove-from-watch-history/:videoId")
  .delete(verifyJwt, removeFromWatchHistory);

router.route("/clear-watch-history").delete(verifyJwt, clearWatchHistory);

export default router;
