import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

import {
  createPost,
  deletePost,
  getUserPosts,
  updatePost,
} from "../controllers/post.controllers.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Post APIs (create, list feed/user posts, update, delete)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreatePostBody:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           example: Hello world! This is my first post.
 *
 *     UpdatePostBody:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           example: Updated post content.
 */

/**
 * @swagger
 * /api/v1/post/get-user-posts:
 *   get:
 *     summary: Get posts feed (all posts) or a user's posts using query userId
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: If provided, returns posts for this userId only
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
 *           example: 20
 *         description: Items per page (default 20)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt
 *         description: Sort field (createdAt, updatedAt, _id)
 *       - in: query
 *         name: sortType
 *         schema:
 *           type: string
 *           example: desc
 *         description: Sort direction (asc/desc)
 *     responses:
 *       200:
 *         description: Posts fetched successfully
 *       400:
 *         description: Invalid userId or invalid query params
 */
router.route("/get-user-posts").get(getUserPosts);

/**
 * @swagger
 * /api/v1/post/create-post:
 *   post:
 *     summary: Create a new post (requires JWT)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostBody'
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: content is required
 *       401:
 *         description: Unauthorized
 */
router.route("/create-post").post(verifyJwt, createPost);

/**
 * @swagger
 * /api/v1/post/update-post/{postId}:
 *   put:
 *     summary: Update a post (requires JWT, only owner)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePostBody'
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       400:
 *         description: Invalid postId or content missing
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.route("/update-post/:postId").put(verifyJwt, updatePost);

/**
 * @swagger
 * /api/v1/post/delete-post/{postId}:
 *   delete:
 *     summary: Delete a post (requires JWT, only owner)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       400:
 *         description: Invalid postId
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.route("/delete-post/:postId").delete(verifyJwt, deletePost);

export default router;
