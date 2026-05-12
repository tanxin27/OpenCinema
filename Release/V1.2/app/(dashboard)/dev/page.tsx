"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, List, Trash2, Loader2 } from "lucide-react";

export default function DevPage() {
  const [taskId, setTaskId] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [listLimit, setListLimit] = useState("10");
  const [listOffset, setListOffset] = useState("0");

  async function queryTask(id: string) {
    if (!id.trim()) {
      toast.error("请输入 Task ID");
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/dreamina?endpoint=${encodeURIComponent(
          `/contents/generations/tasks/${id.trim()}`
        )}`,
        { method: "GET" }
      );
      const data = await res.json().catch(() => ({}));
      setResult({ endpoint: `GET /contents/generations/tasks/${id.trim()}`, status: res.status, data });
    } catch (err: any) {
      toast.error(err.message || "请求失败");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function queryList() {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      params.append("endpoint", "/contents/generations/tasks");
      if (listLimit) params.append("limit", listLimit);
      if (listOffset) params.append("offset", listOffset);
      const res = await fetch(`/api/dreamina?${params.toString()}`, {
        method: "GET",
      });
      const data = await res.json().catch(() => ({}));
      setResult({ endpoint: `GET /contents/generations/tasks?${params.toString()}`, status: res.status, data });
    } catch (err: any) {
      toast.error(err.message || "请求失败");
    } finally {
      setLoadingList(false);
    }
  }

  async function cancelOrDeleteTask(id: string) {
    if (!id.trim()) {
      toast.error("请输入 Task ID");
      return;
    }
    setLoadingDelete(true);
    try {
      const res = await fetch(
        `/api/dreamina?endpoint=${encodeURIComponent(
          `/contents/generations/tasks/${id.trim()}`
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      setResult({ endpoint: `DELETE /contents/generations/tasks/${id.trim()}`, status: res.status, data });
    } catch (err: any) {
      toast.error(err.message || "请求失败");
    } finally {
      setLoadingDelete(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">开发者模式</h1>
      <p className="text-sm text-muted-foreground">
        以下工具直接调用即梦 AI（Seedance）API，用于排查任务状态、查询列表或清理异常任务。
      </p>

      <Tabs defaultValue="detail" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="detail">查询任务</TabsTrigger>
          <TabsTrigger value="list">任务列表</TabsTrigger>
          <TabsTrigger value="delete">取消/删除</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                查询任务详情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="task-id-detail">Task ID</Label>
                  <Input
                    id="task-id-detail"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    placeholder="请输入任务 ID"
                  />
                </div>
                <Button
                  onClick={() => queryTask(taskId)}
                  disabled={loadingDetail}
                  className="gap-2"
                >
                  {loadingDetail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  查询
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <List className="h-4 w-4" />
                查询任务列表
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="list-limit">Limit</Label>
                  <Input
                    id="list-limit"
                    type="number"
                    value={listLimit}
                    onChange={(e) => setListLimit(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="list-offset">Offset</Label>
                  <Input
                    id="list-offset"
                    type="number"
                    value={listOffset}
                    onChange={(e) => setListOffset(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <Button onClick={queryList} disabled={loadingList} className="gap-2">
                {loadingList ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <List className="h-4 w-4" />
                )}
                查询列表
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delete" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                取消或删除任务
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="task-id-delete">Task ID</Label>
                  <Input
                    id="task-id-delete"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    placeholder="请输入任务 ID"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => cancelOrDeleteTask(taskId)}
                  disabled={loadingDelete}
                  className="gap-2"
                >
                  {loadingDelete ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  执行
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                调用 DELETE /contents/generations/tasks/&#123;task_id&#125;，用于取消或删除指定任务。
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              响应结果 <span className="text-xs text-muted-foreground">(HTTP {result.status})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
