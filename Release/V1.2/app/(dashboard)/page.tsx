"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Film, ImageIcon, Wand2 } from "lucide-react";
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

export default function HomePage() {
  const projects = useAppStore((s) => s.projects);
  const assets = useAppStore((s) => s.assets);
  const jobs = useAppStore((s) => s.jobs);
  const setProjects = useAppStore((s) => s.setProjects);
  const setAssets = useAppStore((s) => s.setAssets);
  const setJobs = useAppStore((s) => s.setJobs);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
    fetch("/api/assets")
      .then((r) => r.json())
      .then(setAssets);
    fetch("/api/jobs")
      .then((r) => r.json())
      .then(setJobs);
  }, [setProjects, setAssets, setJobs]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">概览</h1>
        <Button asChild>
          <Link href="/projects">查看项目</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">项目总数</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">资产总数</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">生成任务</CardTitle>
            <Wand2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">最近项目</h2>
          <Button variant="link" asChild className="h-auto p-0">
            <Link href="/projects">查看全部 →</Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.slice(0, 4).map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <div className="group overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-md">
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
              </div>
            </Link>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground">
              暂无项目，去项目页创建一个吧。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
