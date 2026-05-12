"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { Asset, AssetFile, AssetFolder, AssetTag } from "@/lib/store";
import { ASSET_TAG_LABELS } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Trash2, Plus, Folder, FolderOpen, Link, Music } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

export default function AssetsPage() {
  const folders = useAppStore((s) => s.folders);
  const assets = useAppStore((s) => s.assets);
  const setFolders = useAppStore((s) => s.setFolders);
  const setAssets = useAppStore((s) => s.setAssets);
  const addFolder = useAppStore((s) => s.addFolder);
  const removeFolder = useAppStore((s) => s.removeFolder);
  const addAsset = useAppStore((s) => s.addAsset);
  const removeAsset = useAppStore((s) => s.removeAsset);
  const updateAsset = useAppStore((s) => s.updateAsset);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [createAssetOpen, setCreateAssetOpen] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetFolderId, setAssetFolderId] = useState<string | null>(null);
  const [assetTag, setAssetTag] = useState<string | null>("character");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetFiles, setAssetFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // External URL asset dialog
  const [externalUrlOpen, setExternalUrlOpen] = useState(false);
  const [externalName, setExternalName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalType, setExternalType] = useState<"image" | "video" | "audio">("video");
  const [externalFolderId, setExternalFolderId] = useState<string | null>(null);
  const [externalTag, setExternalTag] = useState<string | null>("video");
  const [externalSaving, setExternalSaving] = useState(false);

  const [selectedTag, setSelectedTag] = useState<AssetTag | null>(null);

  // Asset detail dialog
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  // Image preview dialog
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const tagOptions: AssetTag[] = ["character", "scene", "audio", "video", "other"];

  // 打开新建资产弹窗时自动选中当前文件夹
  useEffect(() => {
    if (createAssetOpen && selectedFolderId) {
      setAssetFolderId(selectedFolderId);
    }
  }, [createAssetOpen, selectedFolderId]);

  useEffect(() => {
    fetch("/api/folders").then((r) => r.json()).then(setFolders);
    fetch("/api/assets").then((r) => r.json()).then(setAssets);
  }, [setFolders, setAssets]);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName }),
    });
    const data = await res.json();
    if (res.ok) {
      addFolder(data);
      setCreateFolderOpen(false);
      setNewFolderName("");
      toast.success("文件夹创建成功");
    } else {
      toast.error(data.error || "创建失败");
    }
  }

  async function handleCreateAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!assetName.trim()) return;
    setUploading(true);
    const form = new FormData();
    form.append("name", assetName);
    if (assetFolderId) form.append("folderId", assetFolderId);
    if (assetTag) form.append("tag", assetTag);
    form.append("description", assetDescription);
    assetFiles.forEach((f, i) => form.append(`file-${i}`, f));

    const res = await fetch("/api/assets", { method: "POST", body: form });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      addAsset(data);
      setCreateAssetOpen(false);
      setAssetName("");
      setAssetFolderId(null);
      setAssetTag("character");
      setAssetDescription("");
      setAssetFiles([]);
      toast.success("资产创建成功");
    } else {
      let msg = "创建失败";
      try {
        const data = await res.json();
        msg = data.error || msg;
      } catch {
        msg = `创建失败 (${res.status})`;
      }
      toast.error(msg);
    }
  }

  async function handleCreateExternalAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!externalName.trim() || !externalUrl.trim()) return;
    setExternalSaving(true);
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: externalName.trim(),
        url: externalUrl.trim(),
        type: externalType,
        folderId: externalFolderId,
        tag: externalTag,
        fileName: externalName.trim(),
      }),
    });
    setExternalSaving(false);
    if (res.ok) {
      const data = await res.json();
      addAsset(data);
      setExternalUrlOpen(false);
      setExternalName("");
      setExternalUrl("");
      setExternalType("video");
      setExternalFolderId(null);
      setExternalTag("video");
      toast.success("外部链接资产创建成功");
    } else {
      let msg = "创建失败";
      try {
        const data = await res.json();
        msg = data.error || msg;
      } catch {
        msg = `创建失败 (${res.status})`;
      }
      toast.error(msg);
    }
  }

  async function addFilesToAsset(assetId: string, newFiles: File[]) {
    const form = new FormData();
    newFiles.forEach((f, i) => form.append(`file-${i}`, f));
    const res = await fetch(`/api/assets/${assetId}/files`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (res.ok) {
      const asset = assets.find((a) => a.id === assetId);
      if (asset) {
        updateAsset({ ...asset, files: [...data.files, ...asset.files] });
      }
      toast.success("文件添加成功");
    } else {
      toast.error(data.error || "添加失败");
    }
  }

  async function addUrlToAsset(assetId: string, url: string, name: string, type: string) {
    const res = await fetch(`/api/assets/${assetId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name, type }),
    });
    const data = await res.json();
    if (res.ok) {
      const asset = assets.find((a) => a.id === assetId);
      if (asset) {
        updateAsset({ ...asset, files: [...data.files, ...asset.files] });
      }
      toast.success("链接添加成功");
    } else {
      toast.error(data.error || "添加失败");
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("确定删除此资产？资产下的所有文件都将被删除。")) return;
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    if (res.ok) {
      removeAsset(id);
      toast.success("已删除");
    } else {
      toast.error("删除失败");
    }
  }

  async function deleteFolder(id: string) {
    if (!confirm("确定删除此文件夹？文件夹内的资产将变为未分类。")) return;
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (res.ok) {
      removeFolder(id);
      setAssets(assets.map((a) => (a.folderId === id ? { ...a, folderId: null } : a)));
      if (selectedFolderId === id) setSelectedFolderId(null);
      toast.success("已删除");
    } else {
      toast.error("删除失败");
    }
  }

  const displayedAssets = assets.filter((a) => {
    const matchFolder = selectedFolderId ? a.folderId === selectedFolderId : true;
    const matchTag = selectedTag ? a.tag === selectedTag : true;
    return matchFolder && matchTag;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">资产库</h1>
        <div className="flex items-center gap-2">
          <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
            <DialogTrigger className={cn(buttonVariants({ variant: "outline" }))}>
              <Folder className="mr-2 h-4 w-4" />
              新建文件夹
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>新建文件夹</DialogTitle>
                <DialogDescription>创建一个新的资产分类目录</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="例如：角色设计"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  创建
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={externalUrlOpen} onOpenChange={setExternalUrlOpen}>
            <DialogTrigger className={cn(buttonVariants({ variant: "outline" }))}>
              <Link className="mr-2 h-4 w-4" />
              添加外部链接
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>添加外部链接资产</DialogTitle>
                <DialogDescription>通过 URL 引用外部图片、视频或音频素材</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateExternalAsset} className="space-y-4">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    placeholder="例如：参考视频 A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>外部链接 URL</Label>
                  <Input
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    视频/音频必须是公网可访问的直链地址。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select value={externalType} onValueChange={(v) => setExternalType(v as "image" | "video" | "audio")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">图片</SelectItem>
                      <SelectItem value="video">视频</SelectItem>
                      <SelectItem value="audio">音频</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>所属文件夹</Label>
                  <Select value={externalFolderId || ""} onValueChange={(v) => setExternalFolderId(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择文件夹（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>标签</Label>
                  <Select value={externalTag || ""} onValueChange={(v) => setExternalTag(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tagOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ASSET_TAG_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={externalSaving}>
                  {externalSaving ? "创建中..." : "创建资产"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={createAssetOpen} onOpenChange={setCreateAssetOpen}>
            <DialogTrigger className={cn(buttonVariants())}>
              <Plus className="mr-2 h-4 w-4" />
              新建资产
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>新建资产</DialogTitle>
                <DialogDescription>创建一个资产条目并上传相关文件</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAsset} className="space-y-4">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="例如：男主角"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>所属文件夹</Label>
                  <Select value={assetFolderId} onValueChange={setAssetFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择文件夹（可选）">
                        {folders.find((f) => f.id === assetFolderId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>标签</Label>
                  <Select value={assetTag} onValueChange={setAssetTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择资产类型（可选）">
                        {assetTag ? ASSET_TAG_LABELS[assetTag as AssetTag] : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {tagOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ASSET_TAG_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea
                    value={assetDescription}
                    onChange={(e) => setAssetDescription(e.target.value)}
                    placeholder="资产描述（可选）"
                  />
                </div>
                <div className="space-y-2">
                  <Label>上传文件</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      if (newFiles.length === 0) return;
                      setAssetFiles((prev) => [...prev, ...newFiles]);
                      e.target.value = "";
                    }}
                  />
                  {assetFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assetFiles.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="group relative h-16 w-16 overflow-hidden rounded-lg border bg-muted"
                        >
                          {file.type.startsWith("image/") ? (
                            <FilePreviewImage file={file} />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                              视频
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setAssetFiles(assetFiles.filter((_, idx) => idx !== i))
                            }
                            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? "创建中..." : "创建资产"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Folder sidebar */}
        <div className="w-full space-y-1 md:w-56">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              selectedFolderId === null
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            全部资产
            <span className="ml-auto text-xs opacity-80">{assets.length}</span>
          </button>
          {folders.map((folder) => (
            <div key={folder.id} className="group flex items-center gap-1">
              <button
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  selectedFolderId === folder.id
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Folder className="h-4 w-4" />
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-xs opacity-80">
                  {assets.filter((a) => a.folderId === folder.id).length}
                </span>
              </button>
              <button
                onClick={() => deleteFolder(folder.id)}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Assets grid */}
        <div className="flex-1">
          {/* Tag filter bar */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTag === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              全部
            </button>
            {tagOptions.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTag === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {ASSET_TAG_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                folders={folders}
                onDelete={() => deleteAsset(asset.id)}
                onOpenDetail={() => setDetailAsset(asset)}
              />
            ))}
            {displayedAssets.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">
                {selectedFolderId ? "该文件夹下暂无资产" : "暂无资产，点击右上角创建。"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset Detail Dialog */}
      <Dialog open={!!detailAsset} onOpenChange={(open) => !open && setDetailAsset(null)}>
        <DialogContent className="sm:max-w-7xl h-[95vh] overflow-hidden p-0" showCloseButton>
          {detailAsset && (
            <AssetDetailPanel
              asset={detailAsset}
              folders={folders}
              onClose={() => setDetailAsset(null)}
              onPreviewImage={(url) => setPreviewImageUrl(url)}
              onAddFiles={(files) => addFilesToAsset(detailAsset.id, files)}
              onAddUrl={(url, name, type) => addUrlToAsset(detailAsset.id, url, name, type)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="sm:max-w-7xl p-0 overflow-hidden bg-black/95 border-none" showCloseButton>
          <DialogTitle className="sr-only">图片预览</DialogTitle>
          <DialogDescription className="sr-only">放大预览图片</DialogDescription>
          {previewImageUrl && (
            <div className="flex items-center justify-center h-[90vh]">
              <Image
                src={previewImageUrl}
                alt="preview"
                width={1600}
                height={1200}
                className="max-h-[85vh] max-w-full object-contain"
                onClick={() => setPreviewImageUrl(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetCard({
  asset,
  folders,
  onDelete,
  onOpenDetail,
}: {
  asset: Asset;
  folders: AssetFolder[];
  onDelete: () => void;
  onOpenDetail: () => void;
}) {
  const cover = asset.files[0];
  const folderName = folders.find((f) => f.id === asset.folderId)?.name;

  return (
    <Card className="group flex flex-col overflow-hidden">
      <div
        className="relative aspect-video cursor-pointer bg-muted"
        onClick={onOpenDetail}
      >
        {cover ? (
          cover.type === "image" ? (
            <Image src={cover.url} alt={asset.name} fill className="object-cover" />
          ) : (
            <video src={cover.url} className="h-full w-full object-cover" controls />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            暂无文件
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="cursor-pointer" onClick={onOpenDetail}>
          <div className="flex items-center gap-2">
            <div className="font-medium hover:text-primary transition-colors">{asset.name}</div>
            {asset.tag && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {ASSET_TAG_LABELS[asset.tag as AssetTag]}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {folderName ? folderName : "未分类"} · {asset.files.length} 个文件
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

function AssetDetailPanel({
  asset,
  folders,
  onClose,
  onPreviewImage,
  onAddFiles,
  onAddUrl,
}: {
  asset: Asset;
  folders: AssetFolder[];
  onClose: () => void;
  onPreviewImage: (url: string) => void;
  onAddFiles: (files: File[]) => void;
  onAddUrl: (url: string, name: string, type: string) => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlName, setUrlName] = useState("");
  const [urlType, setUrlType] = useState<"image" | "video" | "audio">("video");
  const [urlSaving, setUrlSaving] = useState(false);

  async function handleAdd() {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    await onAddFiles(selectedFiles);
    setUploading(false);
    setSelectedFiles([]);
  }

  async function handleAddUrl() {
    if (!urlValue.trim() || !urlName.trim()) return;
    setUrlSaving(true);
    await onAddUrl(urlValue.trim(), urlName.trim(), urlType);
    setUrlSaving(false);
    setUrlValue("");
    setUrlName("");
    setShowUrlInput(false);
  }

  const folderName = folders.find((f) => f.id === asset.folderId)?.name;

  return (
    <div className="flex flex-col h-[95vh]">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{asset.name}</h2>
          {asset.tag && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {ASSET_TAG_LABELS[asset.tag as AssetTag]}
            </span>
          )}
        </div>
        {asset.description && (
          <p className="mt-1 text-sm text-muted-foreground">{asset.description}</p>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          {folderName ? folderName : "未分类"} · {asset.files.length} 个文件
        </div>
      </div>

      {/* Files grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {asset.files.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            暂无文件
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {asset.files.map((file) => (
              <div key={file.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                {file.type === "image" ? (
                  <div
                    className="relative h-full w-full cursor-zoom-in"
                    onClick={() => onPreviewImage(file.url)}
                  >
                    <Image src={file.url} alt={file.name} fill className="object-cover" />
                  </div>
                ) : file.type === "video" ? (
                  <video src={file.url} className="h-full w-full object-cover" controls />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <Music className="h-8 w-8" />
                    <span className="text-[10px] px-2 text-center truncate w-full">{file.name}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="truncate block">{file.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: upload & add URL */}
      <div className="border-t bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="h-9 flex-1 text-xs"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
          />
          <Button size="sm" variant="outline" disabled={selectedFiles.length === 0 || uploading} onClick={handleAdd}>
            {uploading ? "上传中..." : "上传文件"}
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setShowUrlInput((s) => !s)}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {showUrlInput ? "取消添加链接" : "+ 添加外部链接"}
        </button>
        {showUrlInput && (
          <div className="space-y-2 rounded-md border bg-background p-3">
            <div className="flex gap-2">
              <Input
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                placeholder="名称"
                className="h-8 text-xs flex-1"
              />
              <select
                value={urlType}
                onChange={(e) => setUrlType(e.target.value as "image" | "video" | "audio")}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="image">图片</option>
                <option value="video">视频</option>
                <option value="audio">音频</option>
              </select>
            </div>
            <Input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://..."
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={!urlValue.trim() || !urlName.trim() || urlSaving}
              onClick={handleAddUrl}
            >
              {urlSaving ? "保存中..." : "确认添加"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// 独立组件管理单个文件预览的 object URL 生命周期
function FilePreviewImage({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
        加载中
      </div>
    );
  }

  return <Image src={url} alt={file.name} fill className="object-cover" />;
}
