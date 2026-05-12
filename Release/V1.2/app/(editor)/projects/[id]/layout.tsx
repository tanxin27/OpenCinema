"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Film,
  ImageIcon,
  Clapperboard,
  Video,
  Music,
  Plus,
  X,
} from "lucide-react";
import SafeImage from "@/components/safe-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ASSET_TAG_LABELS, useAppStore } from "@/lib/store";
import type { AssetTag } from "@/lib/store";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  main_character: "主要角色",
  secondary_character: "次要角色",
  scene: "场景",
  reference_video: "参考视频",
  reference_audio: "参考音频",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  main_character: <Clapperboard className="h-3.5 w-3.5" />,
  secondary_character: <Video className="h-3.5 w-3.5" />,
  scene: <ImageIcon className="h-3.5 w-3.5" />,
  reference_video: <Film className="h-3.5 w-3.5" />,
  reference_audio: <Music className="h-3.5 w-3.5" />,
};

const ROLE_OPTIONS = [
  { value: "main_character", label: "主要角色" },
  { value: "secondary_character", label: "次要角色" },
  { value: "scene", label: "场景" },
  { value: "reference_video", label: "参考视频" },
  { value: "reference_audio", label: "参考音频" },
];

function getDefaultRoleByTag(tag: string | null): string {
  if (tag === "character") return "main_character";
  if (tag === "scene") return "scene";
  if (tag === "video") return "reference_video";
  if (tag === "audio") return "reference_audio";
  return "main_character";
}

function getAssetsForRole(role: string, assets: any[]) {
  if (role === "main_character" || role === "secondary_character") {
    return assets.filter((a) => a.tag === "character");
  }
  if (role === "scene") {
    return assets.filter((a) => a.tag === "scene");
  }
  if (role === "reference_video") {
    return assets.filter((a) => a.tag === "video");
  }
  if (role === "reference_audio") {
    return assets.filter((a) => a.tag === "audio");
  }
  return assets;
}

export default function ProjectEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addTargetRole, setAddTargetRole] = useState<string | null>(null);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [globalTargetRole, setGlobalTargetRole] = useState<string>("main_character");

  const pushPendingEditorFiles = useAppStore((s) => s.pushPendingEditorFiles);

  function fetchProject() {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/projects");
        } else {
          setProject(data);
        }
      });
  }

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (!addOpen) return;
    fetch("/api/assets")
      .then((r) => r.json())
      .then((allAssets) => {
        const linkedIds = new Set(
          project?.assets?.map((a: any) => a.id) || []
        );
        let unlinked = allAssets.filter((a: any) => !linkedIds.has(a.id));
        if (addTargetRole) {
          unlinked = getAssetsForRole(addTargetRole, unlinked);
        }
        setAvailableAssets(unlinked);
        setSelectedAssetIds(new Set());
        if (!addTargetRole && unlinked.length > 0) {
          const first = unlinked[0];
          setGlobalTargetRole(getDefaultRoleByTag(first?.tag || null));
        }
      });
  }, [addOpen, addTargetRole, project]);

  useEffect(() => {
    if (addTargetRole || selectedAssetIds.size === 0) return;
    const selected = availableAssets.filter((a) =>
      selectedAssetIds.has(a.id)
    );
    if (selected.length > 0) {
      const firstTag = selected[0]?.tag;
      setGlobalTargetRole(getDefaultRoleByTag(firstTag || null));
    }
  }, [selectedAssetIds, availableAssets, addTargetRole]);

  function openAddDialog(role: string | null) {
    setAddTargetRole(role);
    setAddOpen(true);
  }

  async function handleAddAssets() {
    if (selectedAssetIds.size === 0) return;
    const targetRole = addTargetRole || globalTargetRole;
    for (const assetId of selectedAssetIds) {
      await fetch(`/api/projects/${id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, role: targetRole }),
      });
    }
    setAddOpen(false);
    setAddTargetRole(null);
    fetchProject();
    toast.success(
      `已添加 ${selectedAssetIds.size} 个资产到 ${ROLE_LABELS[targetRole]}`
    );
  }

  async function handleRemoveFile(assetId: string, fileId: string) {
    const res = await fetch(`/api/projects/${id}/assets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, fileId }),
    });
    if (res.ok) {
      fetchProject();
      toast.success("已移除");
    } else {
      toast.error("移除失败");
    }
  }

  async function handleRemoveAsset(assetId: string) {
    const res = await fetch(`/api/projects/${id}/assets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    if (res.ok) {
      fetchProject();
      toast.success("已移除");
    } else {
      toast.error("移除失败");
    }
  }

  const assetsByRole: Record<string, any[]> = {
    main_character: [],
    secondary_character: [],
    scene: [],
    reference_video: [],
    reference_audio: [],
  };

  if (project?.assets) {
    project.assets.forEach((asset: any) => {
      const role = asset.projectRole || "scene";
      if (!assetsByRole[role]) assetsByRole[role] = [];
      assetsByRole[role].push(asset);
    });
  }

  const dialogTitle = addTargetRole
    ? `添加资产到 ${ROLE_LABELS[addTargetRole]}`
    : "添加资产到项目";

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-muted/40">
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <Link
            href="/projects"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="truncate text-sm font-medium">
            {project?.name || "加载中..."}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {/* Project cover preview */}
          {project?.coverUrl && (
            <div className="relative mb-4 aspect-video overflow-hidden rounded-md border">
              <SafeImage
                src={project.coverUrl}
                alt={project.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Top global add button */}
          <Button
            variant="outline"
            size="sm"
            className="mb-4 w-full"
            onClick={() => openAddDialog(null)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            添加资产
          </Button>

          {/* Assets by role - file granularity with asset name */}
          <div className="space-y-4">
            {Object.entries(assetsByRole).map(([role, assets]) => {
              const files = assets.flatMap((asset) =>
                (asset.files || []).map((file: any) => ({
                  ...file,
                  assetName: asset.name,
                  assetId: asset.id,
                }))
              );
              return (
                <div key={role}>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {ROLE_ICONS[role]}
                    {ROLE_LABELS[role]}
                    <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                      {files.length}
                    </span>
                    <button
                      onClick={() => openAddDialog(role)}
                      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      title={`添加${ROLE_LABELS[role]}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {files.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {files.map((file) => (
                        <div key={file.id} className="space-y-0.5">
                          <div
                            className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                            title={`${file.assetName} - ${file.name}`}
                          >
                            {file.type === "image" ? (
                              <SafeImage
                                src={file.url}
                                alt={file.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <video
                                src={file.url}
                                className="h-full w-full object-cover"
                              />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                pushPendingEditorFiles([
                                  {
                                    id: `${Date.now()}-${Math.random()}`,
                                    url: file.url,
                                    type:
                                      file.type === "image"
                                        ? "image"
                                        : file.type === "video"
                                        ? "video"
                                        : "audio",
                                    name: file.name,
                                  },
                                ]);
                                toast.success(`已添加 ${file.assetName}`);
                              }}
                              className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white opacity-0 transition-opacity hover:bg-primary/90 group-hover:opacity-100"
                              title="添加到生成区"
                            >
                              <ArrowUpRight className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveFile(file.assetId, file.id)}
                              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground leading-tight">
                            {file.assetName}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => openAddDialog(role)}
                      className="flex w-full items-center justify-center rounded-md border border-dashed p-2 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      添加
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Add Asset Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setAddTargetRole(null);
        }}
      >
        <DialogContent className="flex max-h-[80vh] max-w-lg flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {addTargetRole
                ? `从资产库中选择要添加到${ROLE_LABELS[addTargetRole]}的资产`
                : "从资产库中选择要添加的资产，并选择目标分类"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto py-2">
            {availableAssets.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无可用资产，先去资产库创建一些吧
              </div>
            ) : (
              availableAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    const next = new Set(selectedAssetIds);
                    if (next.has(asset.id)) {
                      next.delete(asset.id);
                    } else {
                      next.add(asset.id);
                    }
                    setSelectedAssetIds(next);
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${
                    selectedAssetIds.has(asset.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {asset.files?.[0] ? (
                      asset.files[0].type === "image" ? (
                        <SafeImage
                          src={asset.files[0].url}
                          alt={asset.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                          视频
                        </div>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        无
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {asset.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {asset.tag
                        ? ASSET_TAG_LABELS[asset.tag as AssetTag]
                        : "未分类"}
                      · {asset.files?.length || 0} 个文件
                    </div>
                  </div>
                  {selectedAssetIds.has(asset.id) && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      ✓
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Global mode: role selector */}
          {!addTargetRole && (
            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs">目标分类</Label>
              <Select
                value={globalTargetRole}
                onValueChange={(v) => v && setGlobalTargetRole(v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
                setAddTargetRole(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAddAssets}
              disabled={selectedAssetIds.size === 0}
            >
              添加 ({selectedAssetIds.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
