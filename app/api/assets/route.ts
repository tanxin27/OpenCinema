import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";

export async function GET(_req: NextRequest) {
  const assets = await prisma.asset.findMany({
    orderBy: { createdAt: "desc" },
    include: { files: { orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = formData.get("name") as string | null;
  const folderId = (formData.get("folderId") as string) || null;
  const description = (formData.get("description") as string) || "";
  const rawTag = (formData.get("tag") as string) || null;
  const tag = rawTag && ["character", "scene", "audio", "video", "other"].includes(rawTag) ? rawTag : null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const asset = await prisma.asset.create({
    data: { name, folderId, description, tag },
  });

  const files: { id: string; name: string; url: string; type: string; size: number | null }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("file") && value instanceof File) {
      const { url, size } = await saveUploadedFile(value);
      const type = value.type.startsWith("video/") ? "video" : "image";
      const fileRec = await prisma.assetFile.create({
        data: {
          assetId: asset.id,
          name: value.name,
          url,
          type,
          size,
        },
      });
      files.push(fileRec);
    }
  }

  return NextResponse.json({ ...asset, files }, { status: 201 });
}
