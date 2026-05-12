import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const where = projectId ? { projectId } : {};
  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, type, params } = body;
  if (!projectId || !type) {
    return NextResponse.json(
      { error: "projectId and type are required" },
      { status: 400 }
    );
  }
  const job = await prisma.job.create({
    data: {
      projectId,
      type,
      params: JSON.stringify(params || {}),
      status: "pending",
    },
  });
  return NextResponse.json(job, { status: 201 });
}
