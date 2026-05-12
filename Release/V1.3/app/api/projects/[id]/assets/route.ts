import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const body = await req.json();
  const { assetId, role } = body;
  if (!assetId) {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }

  const existing = await prisma.projectAsset.findUnique({
    where: { projectId_assetId: { projectId, assetId } },
    include: { asset: { include: { files: true } } },
  });

  if (existing) {
    // 已有记录，增量添加所有文件（不重复）
    const currentIds: string[] = JSON.parse(existing.selectedFileIds || "[]");
    const allFileIds = existing.asset.files.map((f) => f.id);
    const mergedIds = [...new Set([...currentIds, ...allFileIds])];

    const updated = await prisma.projectAsset.update({
      where: { id: existing.id },
      data: {
        selectedFileIds: JSON.stringify(mergedIds),
        role: role || existing.role,
      },
    });
    return NextResponse.json(updated);
  }

  // 首次添加，获取资产的所有文件
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { files: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const link = await prisma.projectAsset.create({
    data: {
      projectId,
      assetId,
      role: role || null,
      selectedFileIds: JSON.stringify(asset.files.map((f) => f.id)),
    },
  });
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { assetId, fileId } = await req.json();
  if (!assetId) {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }

  const pa = await prisma.projectAsset.findUnique({
    where: { projectId_assetId: { projectId, assetId } },
  });

  if (!pa) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (fileId) {
    // 单文件删除：从 selectedFileIds 中移除该 fileId
    const currentIds: string[] = JSON.parse(pa.selectedFileIds || "[]");
    const newIds = currentIds.filter((id) => id !== fileId);

    if (newIds.length === 0) {
      // 没有文件了，删除整个 ProjectAsset 记录
      await prisma.projectAsset.delete({ where: { id: pa.id } });
    } else {
      await prisma.projectAsset.update({
        where: { id: pa.id },
        data: { selectedFileIds: JSON.stringify(newIds) },
      });
    }
  } else {
    // 删除整个资产关联
    await prisma.projectAsset.deleteMany({
      where: { projectId, assetId },
    });
  }

  return NextResponse.json({ success: true });
}
