import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { db, userById } from "@/lib/server/db";
import { UploadError, removeUpload, saveUpload } from "@/lib/server/uploads";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  try {
    const { url } = await saveUpload(file, ["image"], 5);
    await removeUpload(user.avatar);
    db().prepare("UPDATE users SET avatar = ? WHERE id = ?").run(url, user.id);
    return NextResponse.json({ user: userById(user.id) });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
