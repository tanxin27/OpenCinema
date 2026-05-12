import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assetId } = await params;
  const contentType = req.headers.get("content-type") || "";

  const files: { id: string; name: string; url: string; type: string; size: number | null }[] = [];

  // JSON mode: add external URL file
  if (contentType.includes("application/json")) {
    const body = await req.json();
    const { url, name, type: typeHint } = body;
    if (!url || !name) {
      return NextResponse.json({ error: "url and name are required" }, { status: 400 });
    }
    const fileType = typeHint === "video" ? "video" : typeHint === "audio" ? "audio" : "image";
    const fileRec = await prisma.assetFile.create({
      data: {
        assetId,
        name,
        url,
        type: fileType,
        size: null,
      },
    });
    files.push(fileRec);
    return NextResponse.json({ files }, { status: 201 });
  }

  // FormData mode: file upload
  const formData = await req.formData();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("file") && value instanceof File) {
      const { url, size } = await saveUploadedFile(value);
      const type = value.type.startsWith("video/") ? "video" : value.type.startsWith("audio/") ? "audio" : "image";
      const fileRec = await prisma.assetFile.create({
        data: {
          assetId,
          name: value.name,
          url,
          type,
          size,
        },
      });
      files.push(fileRec);
    }
  }

  return NextResponse.json({ files }, { status: 201 });
}
