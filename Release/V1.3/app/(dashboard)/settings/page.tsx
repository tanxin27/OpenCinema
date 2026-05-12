"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { KeyRound, Save, Code2, Cloud, Wifi, Upload, Link, CheckCircle2 } from "lucide-react";

const TOS_REGIONS = [
  { value: "cn-beijing", label: "华北2（北京）" },
  { value: "cn-shanghai", label: "华东2（上海）" },
  { value: "cn-guangzhou", label: "华南1（广州）" },
  { value: "cn-hongkong", label: "中国香港" },
  { value: "ap-southeast-1", label: "亚太东南（柔佛）" },
];

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mockMode, setMockMode] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // TOS settings
  const [tosAccessKey, setTosAccessKey] = useState("");
  const [tosSecretKey, setTosSecretKey] = useState("");
  const [tosRegion, setTosRegion] = useState("cn-beijing");
  const [tosBucket, setTosBucket] = useState("");
  const [tosEndpoint, setTosEndpoint] = useState("");
  const [tosHasConfig, setTosHasConfig] = useState(false);
  const [tosSaving, setTosSaving] = useState(false);
  const [tosTesting, setTosTesting] = useState(false);

  // Upload-read test dialog
  const [uploadTestOpen, setUploadTestOpen] = useState(false);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testUploading, setTestUploading] = useState(false);
  const [testResult, setTestResult] = useState<{ url: string; key: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const keySetting = data.find((s: any) => s.key === "DREAMINA_API_KEY");
        setHasKey(!!keySetting?.value);
        const mockSetting = data.find((s: any) => s.key === "MOCK_DREAMINA");
        setMockMode(mockSetting?.value === "true");
        const devSetting = data.find((s: any) => s.key === "DEV_MODE");
        setDevMode(devSetting?.value === "true");

        // Load TOS settings
        const tosAk = data.find((s: any) => s.key === "TOS_ACCESS_KEY_ID");
        const tosSk = data.find((s: any) => s.key === "TOS_SECRET_ACCESS_KEY");
        const tosR = data.find((s: any) => s.key === "TOS_REGION");
        const tosB = data.find((s: any) => s.key === "TOS_BUCKET");
        const tosE = data.find((s: any) => s.key === "TOS_ENDPOINT");
        if (tosAk?.exists) setTosAccessKey(tosAk.value || "");
        if (tosSk?.exists) setTosSecretKey(tosSk.value || "");
        if (tosR?.exists) setTosRegion(tosR.value || "cn-beijing");
        if (tosB?.exists) setTosBucket(tosB.value || "");
        if (tosE?.exists) setTosEndpoint(tosE.value || "");
        setTosHasConfig(!!(tosAk?.exists && tosSk?.exists && tosR?.exists && tosB?.exists));
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
      setHasKey(true);
      setApiKey("");
      toast.success("API Key 已保存");
    } else {
      toast.error("保存失败");
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

  async function saveTosConfig() {
    if (!tosAccessKey.trim() || !tosSecretKey.trim() || !tosRegion.trim() || !tosBucket.trim()) {
      toast.error("AccessKey、SecretKey、Region 和 Bucket 不能为空");
      return;
    }
    setTosSaving(true);
    const fields = [
      { key: "TOS_ACCESS_KEY_ID", value: tosAccessKey.trim() },
      { key: "TOS_SECRET_ACCESS_KEY", value: tosSecretKey.trim() },
      { key: "TOS_REGION", value: tosRegion.trim() },
      { key: "TOS_BUCKET", value: tosBucket.trim() },
      { key: "TOS_ENDPOINT", value: tosEndpoint.trim().replace(/^https?:\/\//, "") },
    ];
    for (const f of fields) {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
    }
    setTosSaving(false);
    setTosHasConfig(true);
    toast.success("TOS 配置已保存");
  }

  async function testTosConnectivity() {
    setTosTesting(true);
    const res = await fetch("/api/upload-to-tos/test");
    const data = await res.json();
    setTosTesting(false);
    if (data.ok) {
      toast.success("TOS 连通性正常");
    } else {
      toast.error(data.error || "连通性测试失败");
    }
  }

  async function runUploadReadTest() {
    if (!testFile) return;
    setTestUploading(true);
    setTestResult(null);
    const formData = new FormData();
    formData.append("file", testFile);
    try {
      const res = await fetch("/api/upload-to-tos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setTestResult({ url: data.url, key: data.key });
        toast.success("上传成功");
      } else {
        toast.error(data.error || "上传失败");
      }
    } catch {
      toast.error("上传请求失败");
    }
    setTestUploading(false);
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
              placeholder={hasKey ? "已配置，输入新值可覆盖" : "请输入即梦 AI API Key"}
            />
            <p className="text-xs text-muted-foreground">
              API Key 仅存储在本地数据库中，不会上传到任何外部服务器。
            </p>
          </div>
          <Button onClick={saveApiKey} disabled={saving || !apiKey.trim()} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存"}
          </Button>
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
                开启后，左侧导航会显示"开发"页签，可用于直接查询即梦 API 任务详情、列表以及取消/删除任务，方便定位问题。
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

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <Cloud className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">TOS 对象存储</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tos-ak">
              Access Key ID
              {tosHasConfig && (
                <span className="ml-2 text-xs text-green-600">已配置</span>
              )}
            </Label>
            <Input
              id="tos-ak"
              type="password"
              value={tosAccessKey}
              onChange={(e) => setTosAccessKey(e.target.value)}
              placeholder={tosHasConfig ? "已配置，输入新值可覆盖" : "请输入 Access Key ID"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tos-sk">
              Secret Access Key
              {tosHasConfig && (
                <span className="ml-2 text-xs text-green-600">已配置</span>
              )}
            </Label>
            <Input
              id="tos-sk"
              type="password"
              value={tosSecretKey}
              onChange={(e) => setTosSecretKey(e.target.value)}
              placeholder={tosHasConfig ? "已配置，输入新值可覆盖" : "请输入 Secret Access Key"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tos-region">Region</Label>
              <Select value={tosRegion} onValueChange={(v) => v && setTosRegion(v)}>
                <SelectTrigger id="tos-region">
                  <SelectValue placeholder="选择地域" />
                </SelectTrigger>
                <SelectContent>
                  {TOS_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tos-bucket">Bucket</Label>
              <Input
                id="tos-bucket"
                value={tosBucket}
                onChange={(e) => setTosBucket(e.target.value)}
                placeholder="存储桶名称"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tos-endpoint">Endpoint（可选）</Label>
            <Input
              id="tos-endpoint"
              value={tosEndpoint}
              onChange={(e) => setTosEndpoint(e.target.value)}
              placeholder={`默认：tos-${tosRegion || "cn-beijing"}.volces.com（无需 https://）`}
            />
            <p className="text-xs text-muted-foreground">
              Endpoint 不需要带 https:// 前缀，留空则自动根据 Region 生成。
              视频/音频/图片上传到 TOS 后会获取公网 URL 供 Seedance API 使用。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={saveTosConfig}
              disabled={tosSaving || !tosAccessKey.trim() || !tosSecretKey.trim() || !tosRegion.trim() || !tosBucket.trim()}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {tosSaving ? "保存中..." : "保存"}
            </Button>
            <Button
              variant="outline"
              onClick={testTosConnectivity}
              disabled={tosTesting || !tosHasConfig}
              className="gap-2"
            >
              {tosTesting ? (
                <Wifi className="h-4 w-4 animate-pulse" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {tosTesting ? "测试中..." : "连通测试"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setUploadTestOpen(true);
                setTestFile(null);
                setTestResult(null);
              }}
              disabled={!tosHasConfig}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              上传读取测试
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload-read test dialog */}
      <Dialog open={uploadTestOpen} onOpenChange={setUploadTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>TOS 上传读取测试</DialogTitle>
            <DialogDescription>
              上传一个文件到 TOS，验证完整链路是否通畅。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>选择文件</Label>
              <Input
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={(e) => {
                  setTestFile(e.target.files?.[0] || null);
                  setTestResult(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                视频/音频会走 TOS 上传，图片也会上传到 TOS 供测试。
              </p>
            </div>
            <Button
              onClick={runUploadReadTest}
              disabled={!testFile || testUploading}
              className="w-full gap-2"
            >
              {testUploading ? (
                <Wifi className="h-4 w-4 animate-pulse" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {testUploading ? "上传中..." : "开始上传"}
            </Button>
            {testResult && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>上传成功</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Object Key</div>
                  <div className="text-xs font-mono break-all">{testResult.key}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">公网 URL</div>
                  <a
                    href={testResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline break-all"
                  >
                    <Link className="h-3 w-3 shrink-0" />
                    {testResult.url}
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  点击链接验证是否能直接在浏览器中访问。如果能打开，说明 Seedance 也能访问。
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
