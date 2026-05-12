"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { KeyRound, Save, Code2, Wifi, Activity } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [mockMode, setMockMode] = useState(false);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const keySetting = data.find((s: any) => s.key === "DREAMINA_API_KEY");
        setMaskedKey(keySetting?.value || "");
        setHasKey(!!keySetting?.exists);
        const mockSetting = data.find((s: any) => s.key === "MOCK_DREAMINA");
        setMockMode(mockSetting?.value === "true");
        const devSetting = data.find((s: any) => s.key === "DEV_MODE");
        setDevMode(devSetting?.value === "true");
      });
  }, []);

  async function saveApiKey() {
    if (!apiKey.trim()) {
      toast.error("请输入 API Key");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "DREAMINA_API_KEY", value: apiKey.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setHasKey(!!data.exists);
      setMaskedKey(data.value || "");
      setApiKey("");
      toast.success("API Key 已保存");
    } else {
      toast.error("保存失败");
    }
  }

  async function testApiKey() {
    setTesting(true);
    const res = await fetch("/api/dreamina/test-key");
    const data = await res.json();
    setTesting(false);
    if (data.valid) {
      toast.success("API Key 连通性正常");
    } else {
      toast.error(data.error || "连通性测试失败");
    }
  }

  async function saveMockMode(value: boolean) {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "MOCK_DREAMINA", value: String(value) }),
    });
    if (res.ok) {
      toast.success(value ? "已开启模拟生成模式" : "已关闭模拟生成模式");
    } else {
      toast.error("保存失败");
    }
  }

  async function saveDevMode(value: boolean) {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "DEV_MODE", value: String(value) }),
    });
    if (res.ok) {
      toast.success(value ? "已开启开发者模式" : "已关闭开发者模式");
    } else {
      toast.error("保存失败");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">设置</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">即梦 AI API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dreamina-key">
              API Key
              {hasKey && (
                <span className="ml-2 text-xs text-green-600">● 已配置</span>
              )}
            </Label>
            <Input
              id="dreamina-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                hasKey
                  ? `当前: ${maskedKey}，输入新值可覆盖`
                  : "请输入即梦 AI API Key"
              }
            />
            <p className="text-xs text-muted-foreground">
              API Key 仅存储在本地数据库中，不会上传到任何外部服务器。
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={saveApiKey}
              disabled={saving || !apiKey.trim()}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "保存中..." : "保存"}
            </Button>
            <Button
              variant="outline"
              onClick={testApiKey}
              disabled={testing || !hasKey}
              className="gap-2"
            >
              {testing ? (
                <Wifi className="h-4 w-4 animate-pulse" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              {testing ? "测试中..." : "测试连通性"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="h-5 w-5 text-muted-foreground flex items-center justify-center text-sm font-bold">M</div>
          <CardTitle className="text-base">模拟生成模式（Mock）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mock-mode">启用模拟生成</Label>
              <p className="text-xs text-muted-foreground">
                开启后，生成视频将不会调用真实 API，而是返回占位图，用于 UI 调试。
              </p>
            </div>
            <Switch
              id="mock-mode"
              checked={mockMode}
              onCheckedChange={(v) => {
                setMockMode(v);
                saveMockMode(v);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <Code2 className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">开发者模式</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dev-mode">启用开发者模式</Label>
              <p className="text-xs text-muted-foreground">
                开启后，左侧导航会显示“开发”页签，可用于直接查询即梦 API 任务详情、列表以及取消/删除任务，方便定位问题。
              </p>
            </div>
            <Switch
              id="dev-mode"
              checked={devMode}
              onCheckedChange={(v) => {
                setDevMode(v);
                saveDevMode(v);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
