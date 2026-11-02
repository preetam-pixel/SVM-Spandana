import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./db";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic",
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "weba", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/x-matroska": "mkv",
};
export const MIME_BY_EXT = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

export class UploadError extends Error {}

/** Saves an uploaded file under data/uploads and returns its public URL (/api/media/<name>). */
export async function saveUpload(file: File, allowed: ("image" | "audio" | "video")[], maxMb: number) {
  const type = file.type || "";
  const ext = EXT[type];
  if (!ext || !allowed.some((a) => type.startsWith(`${a}/`))) throw new UploadError(`Unsupported file type ${type || "(unknown)"}.`);
  if (file.size > maxMb * 1024 * 1024) throw new UploadError(`File is too large (max ${maxMb} MB).`);
  const name = `${crypto.randomBytes(10).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/api/media/${name}`, mime: type };
}

export async function removeUpload(url: string | null | undefined) {
  const name = url?.startsWith("/api/media/") ? path.basename(url) : null;
  if (name) await fs.unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}
