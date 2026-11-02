"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
const storage = () =>
  (client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } }))
    .storage.from("media");

export type UploadKind = "photo" | "audio" | "video" | "avatar";

/**
 * Uploads a file straight to Supabase Storage: the server checks type/size and hands back
 * a one-time signed URL, so the browser never needs write access to the bucket.
 */
export async function uploadMedia(file: File, kind: UploadKind): Promise<{ path: string; mime: string } | { error: string }> {
  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, mime: file.type, size: file.size }),
  });
  const d = await res.json();
  if (!res.ok) return { error: d.error ?? "Upload not allowed" };
  const { error } = await storage().uploadToSignedUrl(d.path, d.token, file, { contentType: file.type });
  if (error) return { error: error.message };
  return { path: d.path, mime: file.type };
}
