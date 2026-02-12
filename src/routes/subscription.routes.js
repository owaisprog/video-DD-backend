import { Router } from "express";

import { verifyJwt } from "../middlewares/auth.middleware.js";

import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controllers.js";
const router = Router();

router
  .route("/subscribe-toggle/:channelId")
  .patch(verifyJwt, toggleSubscription);
router
  .route("/user-subcribed-channel/:channelId")
  .get(verifyJwt, getUserChannelSubscribers);
router
  .route("/all-subscribed-channel/:subscriberId")
  .get(verifyJwt, getSubscribedChannels);

export default router;
