import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assetId } = await params;
  const formData = await req.formData();

  const files: { id: string; name: string; url: string; type: string; size: number | null }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("file") && value instanceof File) {
      const { url, size } = await saveUploadedFile(value);
      const type = value.type.startsWith("video/") ? "video" : "image";
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
