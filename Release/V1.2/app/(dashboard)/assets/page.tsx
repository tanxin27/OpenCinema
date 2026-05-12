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
import { Upload, Trash2, Plus, Folder, FolderOpen } from "lucide-react";
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

  const [selectedTag, setSelectedTag] = useState<AssetTag | null>(null);

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
                onAddFiles={(files) => addFilesToAsset(asset.id, files)}
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
    </div>
  );
}

function AssetCard({
  asset,
  folders,
  onDelete,
  onAddFiles,
}: {
  asset: Asset;
  folders: AssetFolder[];
  onDelete: () => void;
  onAddFiles: (files: File[]) => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleAdd() {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    await onAddFiles(selectedFiles);
    setUploading(false);
    setSelectedFiles([]);
  }

  const cover = asset.files[0];
  const folderName = folders.find((f) => f.id === asset.folderId)?.name;

  return (
    <Card className="group flex flex-col overflow-hidden">
      <div className="relative aspect-video bg-muted">
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
          onClick={onDelete}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-medium">{asset.name}</div>
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

        <div className="mt-auto space-y-2">
          <div className="flex flex-wrap gap-2">
            {asset.files.slice(0, 4).map((file) => (
              <div key={file.id} className="relative h-10 w-10 overflow-hidden rounded border">
                {file.type === "image" ? (
                  <Image src={file.url} alt={file.name} fill className="object-cover" />
                ) : (
                  <video src={file.url} className="h-full w-full object-cover" />
                )}
              </div>
            ))}
            {asset.files.length > 4 && (
              <div className="flex h-10 w-10 items-center justify-center rounded border text-xs text-muted-foreground">
                +{asset.files.length - 4}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              multiple
              accept="image/*,video/*"
              className="h-8 flex-1 text-xs"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />
            <Button size="sm" variant="outline" disabled={selectedFiles.length === 0 || uploading} onClick={handleAdd}>
              {uploading ? "..." : "添加"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
