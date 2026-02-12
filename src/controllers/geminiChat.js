import { GoogleGenAI, MediaResolution } from "@google/genai";
import axios from "axios";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import asyncHandler from "../utils/asyncHandler.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Cache only the uploaded file reference so you don't re-upload every request
// videoUrl -> { name, uri, mimeType }
const uploadedFileCache = new Map();

// ---------- helpers ----------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getErrCode(err) {
  return (
    err?.error?.code ||
    err?.code ||
    err?.statusCode ||
    err?.response?.status ||
    null
  );
}

async function with429Retry(fn, retries = 5) {
  let delay = 1200;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const code = getErrCode(err);
      if (code !== 429 || i === retries) throw err;
      await sleep(delay);
      delay = Math.min(delay * 2, 30_000);
    }
  }
}

function normalizePrevHistory(prevHistory) {
  if (!Array.isArray(prevHistory)) return [];

  return prevHistory
    .map((m) => {
      if (m?.role && Array.isArray(m?.parts)) return m;
      if (m?.role && typeof m?.content === "string")
        return { role: m.role, parts: [{ text: m.content }] };
      if (m?.role && typeof m?.text === "string")
        return { role: m.role, parts: [{ text: m.text }] };
      return null;
    })
    .filter(Boolean);
}

async function downloadToTempFile(videoUrl) {
  const url = new URL(videoUrl);
  const ext = path.extname(url.pathname) || ".mp4";
  const tmpPath = path.join(
    tmpdir(),
    `gemini-video-${crypto.randomUUID()}${ext}`
  );

  const resp = await axios.get(videoUrl, { responseType: "stream" });
  await pipeline(resp.data, createWriteStream(tmpPath));

  const mimeType = resp.headers?.["content-type"] || "video/mp4";
  return { tmpPath, mimeType };
}

async function waitForFileActive(fileName, timeoutMs = 10 * 60 * 1000) {
  const start = Date.now();
  while (true) {
    const f = await with429Retry(() => ai.files.get({ name: fileName }));
    if (f?.state === "ACTIVE") return f;
    if (f?.state === "FAILED") {
      throw new Error(`Gemini file processing FAILED for ${fileName}`);
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Timed out waiting for file to become ACTIVE (${fileName}). Last state=${f?.state}`
      );
    }
    await sleep(2000);
  }
}

async function getOrUploadVideo(videoUrl) {
  const cached = uploadedFileCache.get(videoUrl);
  if (cached) return cached;

  const { tmpPath, mimeType } = await downloadToTempFile(videoUrl);

  try {
    const uploaded = await with429Retry(() =>
      ai.files.upload({
        file: tmpPath,
        config: { mimeType },
      })
    );

    // Files can be PROCESSING right after upload, wait until ACTIVE
    const active = await waitForFileActive(uploaded.name);

    const info = {
      name: active.name,
      uri: active.uri,
      mimeType: active.mimeType || mimeType || "video/mp4",
    };
    uploadedFileCache.set(videoUrl, info);
    return info;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

// Accept clip offsets like "40s", "01:20", 80, etc.
function toOffsetString(v) {
  if (v === undefined || v === null || v === "") return undefined;

  // number => seconds
  if (typeof v === "number" && Number.isFinite(v)) return `${Math.max(0, v)}s`;

  // string "MM:SS" or "HH:MM:SS"
  if (typeof v === "string" && v.includes(":")) {
    const parts = v.split(":").map((x) => Number(x));
    if (parts.some((n) => !Number.isFinite(n))) return undefined;
    let seconds = 0;
    if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    if (parts.length === 3)
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    return `${Math.max(0, seconds)}s`;
  }

  // string "40s" or "80"
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed.endsWith("s")) return trimmed;
    const n = Number(trimmed);
    if (Number.isFinite(n)) return `${Math.max(0, n)}s`;
  }

  return undefined;
}

// ---------- controller ----------
export const GeminiChat = asyncHandler(async (req, res) => {
  const videoUrl = req.body.videoUrl || req.body.videoUUrl; // support both
  const { newText, prevHistory = [], clip, fps } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: "Missing GEMINI_API_KEY in environment." });
  }
  if (!videoUrl || !newText) {
    return res
      .status(400)
      .json({ error: "videoUrl and newText are required." });
  }

  const history = normalizePrevHistory(prevHistory);
  const { uri, mimeType } = await getOrUploadVideo(videoUrl);

  // Force timestamped JSON output
  const systemInstruction = `
You are a video Q&A assistant.
Answer ONLY using the provided video.
Always include timestamps (MM:SS or HH:MM:SS) for each claim you make.
If the answer is not in the video, say you can't find it.
Output MUST be valid JSON that matches the schema.
`.trim();

  const responseSchema = {
    type: "object",
    properties: {
      answer: { type: "string" },
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            start: { type: "string", description: "MM:SS or HH:MM:SS" },
            end: { type: "string", description: "MM:SS or HH:MM:SS" },
            detail: { type: "string" },
          },
          required: ["start", "end", "detail"],
        },
      },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
    },
    required: ["answer", "evidence", "confidence"],
  };

  // Optional clip + fps to reduce token usage (important for free-tier 429)
  // Example clip body:
  // clip: { startOffset: "40s", endOffset: "80s" }
  // clip: { startOffset: "01:20", endOffset: "02:10" }
  const startOffset = toOffsetString(
    clip?.startOffset ?? clip?.start ?? clip?.from
  );
  const endOffset = toOffsetString(clip?.endOffset ?? clip?.end ?? clip?.to);

  // videoMetadata supports clipping + fps in JS. :contentReference[oaicite:3]{index=3}
  const videoPart = {
    fileData: { fileUri: uri, mimeType },
    ...(startOffset || endOffset || fps
      ? {
          videoMetadata: {
            ...(startOffset ? { startOffset } : {}),
            ...(endOffset ? { endOffset } : {}),
            ...(fps ? { fps: Number(fps) } : {}),
          },
        }
      : {}),
  };

  const contents = [
    ...history,
    {
      role: "user",
      parts: [
        videoPart,
        { text: newText }, // put text AFTER video part (recommended) :contentReference[oaicite:4]{index=4}
      ],
    },
  ];

  try {
    const response = await with429Retry(() =>
      ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema,
          // Lower token usage for video frames :contentReference[oaicite:5]{index=5}
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
        },
      })
    );

    let parsed;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      parsed = { answer: response.text, evidence: [], confidence: "low" };
    }

    return res.json({ model: MODEL, response: parsed });
  } catch (err) {
    const code = getErrCode(err) || 500;
    return res.status(code === 429 ? 429 : 500).json({
      error: "Gemini API error",
      code,
      message: err?.message || String(err),
      tip:
        code === 429
          ? "Free tier rate limits are tight for video. Use clip {startOffset,endOffset} and/or lower fps (e.g. 0.5) to reduce tokens."
          : undefined,
    });
  }
});
