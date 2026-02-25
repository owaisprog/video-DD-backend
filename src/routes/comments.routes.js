import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comments.controllers.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comments APIs (Video comments CRUD)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CommentUser:
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
 *           example: https://res.cloudinary.com/demo/image/upload/avatar.png
 *
 *     Comment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 65f2c1a2d3e4f567890abc99
 *         text:
 *           type: string
 *           example: Nice video!
 *         video:
 *           type: string
 *           example: 65f2c1a2d3e4f567890abc12
 *         user:
 *           $ref: '#/components/schemas/CommentUser'
 *         createdAt:
 *           type: string
 *           example: 2026-02-26T02:00:00.000Z
 *         updatedAt:
 *           type: string
 *           example: 2026-02-26T02:10:00.000Z
 *
 *     AddCommentBody:
 *       type: object
 *       required:
 *         - text
 *       properties:
 *         text:
 *           type: string
 *           example: This is awesome!
 *
 *     UpdateCommentBody:
 *       type: object
 *       required:
 *         - text
 *       properties:
 *         text:
 *           type: string
 *           example: Updated comment text
 */

/**
 * @swagger
 * /api/v1/comment/video/{videoId}:
 *   get:
 *     summary: Get comments of a video (paginated)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Results per page (default 10, max 50)
 *     responses:
 *       200:
 *         description: Comments fetched successfully
 *       400:
 *         description: Invalid or missing videoId
 *
 *   post:
 *     summary: Add comment to a video (requires JWT)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddCommentBody'
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         description: Invalid input (videoId/text missing)
 *       401:
 *         description: Unauthorized
 */
router
  .route("/video/:videoId")
  .get(getVideoComments)
  .post(verifyJwt, addComment);

/**
 * @swagger
 * /api/v1/comment/{commentId}:
 *   patch:
 *     summary: Update a comment (requires JWT, only owner)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCommentBody'
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       400:
 *         description: Invalid commentId or missing text
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed (not owner)
 *       404:
 *         description: Comment not found
 *
 *   delete:
 *     summary: Delete a comment (requires JWT, only owner)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       400:
 *         description: Invalid commentId
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed (not owner)
 *       404:
 *         description: Comment not found
 */
router
  .route("/:commentId")
  .patch(verifyJwt, updateComment)
  .delete(verifyJwt, deleteComment);

export default router;
