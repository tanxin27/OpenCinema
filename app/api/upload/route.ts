import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const { url, size } = await saveUploadedFile(file);
  const type = file.type.startsWith("video/")
    ? "video"
    : file.type.startsWith("audio/")
    ? "audio"
    : "image";

  return NextResponse.json({
    url,
    type,
    name: file.name,
    size,
  });
}
