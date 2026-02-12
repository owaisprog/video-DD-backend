import { Router } from "express";

import { GeminiChat } from "../controllers/geminiChat.js";

const router = Router();

router.route("/chat").post(GeminiChat);

export default router;
