import { Router } from "express";
import {
  getCurrentUser,
  getUserChannelProfile,
  getUserWatchHistory,
  loginUser,
  logoutUser,
  registerUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  updatePassword,
} from "../controllers/user.controllers.js";
import upload from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/logout").get(verifyJwt, logoutUser);
router.route("/change-password").patch(verifyJwt, updatePassword);
router.route("/get-current-user").get(verifyJwt, getCurrentUser);
router.route("/update-account-details").patch(verifyJwt, updateAccountDetails);
router
  .route("/update-avatar")
  .patch(verifyJwt, upload.single("avatar"), updateAvatar);
router
  .route("/update-coverImage")
  .patch(verifyJwt, upload.single("coverImage"), updateCoverImage);
router
  .route("/user-channel-profile/:username")
  .get(verifyJwt, getUserChannelProfile);
router.route("/user-watch-history").get(verifyJwt, getUserWatchHistory);

export default router;
