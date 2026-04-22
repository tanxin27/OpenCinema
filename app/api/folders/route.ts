import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const folders = await prisma.assetFolder.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const folder = await prisma.assetFolder.create({
    data: { name },
  });
  return NextResponse.json(folder, { status: 201 });
}
