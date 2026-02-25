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

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User authentication & profile APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterUserBody:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - fullname
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           example: johndoe
 *         email:
 *           type: string
 *           example: johndoe@gmail.com
 *         fullname:
 *           type: string
 *           example: John Doe
 *         password:
 *           type: string
 *           example: Pass@1234
 *
 *     LoginUserBody:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           example: johndoe@gmail.com
 *         username:
 *           type: string
 *           example: johndoe
 *         password:
 *           type: string
 *           example: Pass@1234
 *
 *     UpdatePasswordBody:
 *       type: object
 *       required:
 *         - password
 *         - newPassword
 *       properties:
 *         password:
 *           type: string
 *           example: Pass@1234
 *         newPassword:
 *           type: string
 *           example: NewPass@1234
 *
 *     UpdateAccountDetailsBody:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           example: johndoe_new
 *         fullname:
 *           type: string
 *           example: John Doe Updated
 */

/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Register a new user (multipart/form-data)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/RegisterUserBody'
 *               - type: object
 *                 properties:
 *                   avatar:
 *                     type: string
 *                     format: binary
 *                   coverImage:
 *                     type: string
 *                     format: binary
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists or avatar missing
 */
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Login user (sets cookies accessToken & refreshToken)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginUserBody'
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: User not found or missing username/email
 *       401:
 *         description: Invalid credentials
 */
router.route("/login").post(loginUser);

/**
 * @swagger
 * /api/v1/users/logout:
 *   get:
 *     summary: Logout user (requires JWT)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.route("/logout").get(verifyJwt, logoutUser);

/**
 * @swagger
 * /api/v1/users/change-password:
 *   patch:
 *     summary: Change password (requires JWT)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordBody'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 *       401:
 *         description: Unauthorized
 */
router.route("/change-password").patch(verifyJwt, updatePassword);

/**
 * @swagger
 * /api/v1/users/get-current-user:
 *   get:
 *     summary: Get current logged in user (requires JWT)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user fetched
 *       401:
 *         description: Unauthorized
 */
router.route("/get-current-user").get(verifyJwt, getCurrentUser);

/**
 * @swagger
 * /api/v1/users/update-account-details:
 *   patch:
 *     summary: Update username/fullname (requires JWT)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAccountDetailsBody'
 *     responses:
 *       200:
 *         description: Account details updated
 *       401:
 *         description: Unauthorized
 */
router.route("/update-account-details").patch(verifyJwt, updateAccountDetails);

/**
 * @swagger
 * /api/v1/users/update-avatar:
 *   patch:
 *     summary: Update avatar (multipart/form-data) (requires JWT)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *       400:
 *         description: Avatar file missing
 *       401:
 *         description: Unauthorized
 */
router
  .route("/update-avatar")
  .patch(verifyJwt, upload.single("avatar"), updateAvatar);

/**
 * @swagger
 * /api/v1/users/update-coverImage:
 *   patch:
 *     summary: Update cover image (multipart/form-data) (requires JWT)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               coverImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cover image updated successfully
 *       400:
 *         description: Cover image file missing
 *       401:
 *         description: Unauthorized
 */
router
  .route("/update-coverImage")
  .patch(verifyJwt, upload.single("coverImage"), updateCoverImage);

/**
 * @swagger
 * /api/v1/users/user-channel-profile/{channelId}:
 *   get:
 *     summary: Get a user channel profile by channelId (requires JWT)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel user id
 *     responses:
 *       200:
 *         description: Channel profile fetched
 *       400:
 *         description: channelId missing
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router
  .route("/user-channel-profile/:channelId")
  .get(verifyJwt, getUserChannelProfile);

/**
 * @swagger
 * /api/v1/users/user-watch-history:
 *   get:
 *     summary: Get current user's watch history (requires JWT)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watch history fetched
 *       401:
 *         description: Unauthorized
 */
router.route("/user-watch-history").get(verifyJwt, getUserWatchHistory);

export default router;
