"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Trash2, Film, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import Image from "next/image";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString("zh-CN");
}

export default function ProjectsPage() {
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const removeProject = useAppStore((s) => s.removeProject);
  const updateProject = useAppStore((s) => s.updateProject);

  // Create
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editUploading, setEditUploading] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  }, [setProjects]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setUploading(true);

    const form = new FormData();
    form.append("name", name);
    if (description) form.append("description", description);
    if (coverFile) form.append("cover", coverFile);

    const res = await fetch("/api/projects", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);

    if (res.ok) {
      setProjects([data, ...projects]);
      setOpen(false);
      setName("");
      setDescription("");
      setCoverFile(null);
      toast.success("项目创建成功");
    } else {
      toast.error(data.error || "创建失败");
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("确定删除此项目？")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      removeProject(id);
      toast.success("已删除");
    } else {
      toast.error("删除失败");
    }
  }

  function openEdit(project: any) {
    setEditingProject(project);
    setEditName(project.name || "");
    setEditDescription(project.description || "");
    setEditCoverFile(null);
    setEditOpen(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProject || !editName.trim()) return;
    setEditUploading(true);

    const form = new FormData();
    form.append("name", editName.trim());
    form.append("description", editDescription);
    if (editCoverFile) form.append("cover", editCoverFile);

    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: "PATCH",
      body: form,
    });
    const data = await res.json();
    setEditUploading(false);

    if (res.ok) {
      updateProject(data);
      setEditOpen(false);
      setEditingProject(null);
      setEditCoverFile(null);
      toast.success("项目已更新");
    } else {
      toast.error(data.error || "更新失败");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">项目</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="group relative flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/50 transition-colors hover:bg-muted">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm transition-colors group-hover:bg-accent">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">新建项目</span>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>新建项目</DialogTitle>
              <DialogDescription>创建一个新的 AI 工作流项目</DialogDescription>
            </DialogHeader>
            <form onSubmit={createProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="项目名称"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">描述</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="项目描述（可选）"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">封面</Label>
                <Input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                />
                {coverFile && (
                  <div className="text-xs text-muted-foreground">
                    已选择: {coverFile.name}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? "创建中..." : "创建"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>编辑项目</DialogTitle>
              <DialogDescription>修改项目的基本信息</DialogDescription>
            </DialogHeader>
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">名称</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="项目名称"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">描述</Label>
                <Textarea
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="项目描述（可选）"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cover">封面</Label>
                {editingProject?.coverUrl && !editCoverFile && (
                  <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-lg">
                    <Image
                      src={editingProject.coverUrl}
                      alt="current cover"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <Input
                  id="edit-cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditCoverFile(e.target.files?.[0] || null)}
                />
                {editCoverFile && (
                  <div className="text-xs text-muted-foreground">
                    已选择新封面: {editCoverFile.name}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={editUploading}>
                {editUploading ? "保存中..." : "保存"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {projects.map((p) => (
          <div
            key={p.id}
            className="group relative overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-md"
          >
            <Link href={`/projects/${p.id}`} className="block">
              <div className="relative aspect-[4/3] bg-muted">
                {p.coverUrl ? (
                  <Image
                    src={p.coverUrl}
                    alt={p.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Film className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  编辑于 {timeAgo(p.updatedAt)}
                </div>
              </div>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "absolute right-2 top-2 h-8 w-8 bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 hover:text-white group-hover:opacity-100"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(p)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteProject(p.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
