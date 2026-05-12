import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projectAssets: true, jobs: true } },
    },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const coverFile = formData.get("cover") as File | null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let coverUrl: string | null = null;
  if (coverFile && coverFile.size > 0) {
    const saved = await saveUploadedFile(coverFile);
    coverUrl = saved.url;
  }

  const project = await prisma.project.create({
    data: { name, description, coverUrl },
  });
  return NextResponse.json(project, { status: 201 });
}
