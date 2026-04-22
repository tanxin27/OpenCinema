import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      projectAssets: {
        orderBy: { createdAt: "desc" },
        include: { asset: { include: { files: { orderBy: { createdAt: "desc" } } } } },
      },
      jobs: { orderBy: { createdAt: "desc" } },
      workflows: true,
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsedProject = {
    ...project,
    assets: project.projectAssets.map((pa) => {
      const selectedIds = JSON.parse(pa.selectedFileIds || "[]");
      const hasSelection = selectedIds.length > 0;
      return {
        ...pa.asset,
        projectRole: pa.role,
        selectedFileIds: selectedIds,
        files: pa.asset.files.filter(
          (f) => !hasSelection || selectedIds.includes(f.id)
        ),
      };
    }),
    jobs: project.jobs.map((j) => ({
      ...j,
      params: JSON.parse(j.params || "{}"),
    })),
    workflows: project.workflows.map((w) => ({
      ...w,
      nodes: JSON.parse(w.nodes || "[]"),
      edges: JSON.parse(w.edges || "[]"),
    })),
  };
  return NextResponse.json(parsedProject);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, coverUrl, status } = body;
  try {
    const project = await prisma.project.update({
      where: { id },
      data: { name, description, coverUrl, status },
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
