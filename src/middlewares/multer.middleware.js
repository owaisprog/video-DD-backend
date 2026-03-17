import multer from "multer";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_TEMP_DIR = process.env.UPLOAD_TEMP_DIR || "/shared/uploads";

fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });

function sanitizeBaseName(originalName = "file") {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);

  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safe || "file";
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_TEMP_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeBase = sanitizeBaseName(file.originalname || "file");
    cb(null, `${Date.now()}-${randomUUID()}-${safeBase}${ext}`);
  },
});

const upload = multer({ storage });

export default upload;
