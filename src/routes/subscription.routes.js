import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controllers.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Channel subscription APIs (subscribe/unsubscribe, get subscribers, get subscribed channels)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ToggleSubscriptionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Channel subscribed successfully
 *         data:
 *           type: object
 *           properties:
 *             subscribed:
 *               type: boolean
 *               example: true
 *
 *     SubscriberUser:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 65f2c1a2d3e4f567890abc12
 *         username:
 *           type: string
 *           example: johndoe
 *         fullname:
 *           type: string
 *           example: John Doe
 *         avatar:
 *           type: string
 *           example: https://res.cloudinary.com/demo/avatar.png
 */

/**
 * @swagger
 * /api/v1/subscription/subscribe-toggle/{channelId}:
 *   patch:
 *     summary: Subscribe or unsubscribe to a channel (requires JWT)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel (User) ID
 *     responses:
 *       200:
 *         description: Subscription toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ToggleSubscriptionResponse'
 *       400:
 *         description: Invalid channelId or trying to subscribe to yourself
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Channel not found
 */
router
  .route("/subscribe-toggle/:channelId")
  .patch(verifyJwt, toggleSubscription);

/**
 * @swagger
 * /api/v1/subscription/user-subcribed-channel/{channelId}:
 *   get:
 *     summary: Get all subscribers of a channel (requires JWT)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel (User) ID
 *     responses:
 *       200:
 *         description: Subscribers fetched successfully
 *       400:
 *         description: Invalid channelId
 *       401:
 *         description: Unauthorized
 */
router
  .route("/user-subcribed-channel/:channelId")
  .get(verifyJwt, getUserChannelSubscribers);

/**
 * @swagger
 * /api/v1/subscription/all-subscribed-channel/{subscriberId}:
 *   get:
 *     summary: Get all channels a user has subscribed to (requires JWT)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscriber (User) ID
 *     responses:
 *       200:
 *         description: Subscribed channels fetched successfully
 *       400:
 *         description: Invalid subscriberId
 *       401:
 *         description: Unauthorized
 */
router
  .route("/all-subscribed-channel/:subscriberId")
  .get(verifyJwt, getSubscribedChannels);

export default router;
