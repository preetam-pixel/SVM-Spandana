import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/server/db";
import { MIME_BY_EXT } from "@/lib/server/uploads";

export const runtime = "nodejs";

/** Streams an uploaded file, with Range support so audio/video can seek. */
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = path.basename((await params).file);
  const full = path.join(UPLOAD_DIR, name);
  if (!/^[a-f0-9]{20}\.[a-z0-9]+$/.test(name) || !fs.existsSync(full)) return new Response("Not found", { status: 404 });
  const size = fs.statSync(full).size;
  const type = MIME_BY_EXT[name.split(".").pop()!] ?? "application/octet-stream";
  const headers: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable" };

  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(fs.createReadStream(full, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, { headers: { ...headers, "Content-Length": String(size) } });
}
