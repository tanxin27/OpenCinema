"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  ImageIcon,
  Film,
  Music,
  ChevronDown,
  ArrowUp,
  X,
  Trash2,
  Download,
  Copy,
  Maximize2,
  Snowflake,
} from "lucide-react";
import SafeImage from "@/components/safe-image";
import { useAppStore } from "@/lib/store";

const ratioOptions = [
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "3:4", label: "3:4" },
  { value: "9:16", label: "9:16" },
];

const resolutionOptions = [
  { value: "480p", label: "480P" },
  { value: "720p", label: "720P" },
  { value: "1080p", label: "1080P" },
];

const modelOptions = [
  { value: "doubao-seedance-2-0-260128", label: "seedance 2.0" },
  { value: "doubao-seedance-2-0-fast-260128", label: "seedance 2.0-fast" },
];

function RatioIcon({ ratio }: { ratio: string }) {
  const dims: Record<string, string> = {
    "16:9": "w-5 h-3",
    "4:3": "w-4 h-3",
    "1:1": "w-3 h-3",
    "3:4": "w-3 h-4",
    "9:16": "w-2.5 h-4",
  };
  return (
    <div
      className={cn(
        "rounded-sm border border-current opacity-80",
        dims[ratio] || "w-4 h-3"
      )}
    />
  );
}

function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  const div = document.createElement("div");
  document.body.appendChild(div);

  const style = window.getComputedStyle(textarea);
  const textareaRect = textarea.getBoundingClientRect();

  div.style.position = "fixed";
  div.style.top = `${textareaRect.top}px`;
  div.style.left = `${textareaRect.left}px`;
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.overflowWrap = "break-word";
  div.style.wordWrap = "break-word";
  div.style.width = `${textareaRect.width}px`;
  div.style.boxSizing = style.boxSizing || "border-box";

  const properties = [
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontFamily",
    "lineHeight",
    "textAlign",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "textIndent",
    "whiteSpace",
    "wordWrap",
  ] as const;

  properties.forEach((prop) => {
    div.style.setProperty(prop, style.getPropertyValue(prop));
  });

  const text = textarea.value.substring(0, position);
  const span = document.createElement("span");
  span.textContent = textarea.value.substring(position) || ".";

  div.textContent = text;
  div.appendChild(span);

  const spanRect = span.getBoundingClientRect();

  document.body.removeChild(div);

  return {
    top: spanRect.top - textareaRect.top,
    left: spanRect.left - textareaRect.left,
  };
}

type UploadedAsset = {
  id: string;
  url: string;
  type: "image" | "video" | "audio";
  name: string;
  frozen?: boolean;
};

function errMsg(raw: any, fallback: string) {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    return raw.error || raw.message || JSON.stringify(raw);
  }
  return fallback;
}

function isVideoUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return (
      pathname.endsWith(".mp4") ||
      pathname.endsWith(".mov") ||
      pathname.endsWith(".webm") ||
      pathname.endsWith(".m3u8")
    );
  } catch {
    return false;
  }
}

export default function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const [dragState, setDragState] = useState<"idle" | "valid" | "invalid">("idle");

  const [model, setModel] = useState("doubao-seedance-2-0-260128");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState("1080p");
  const [generateAudio, setGenerateAudio] = useState("true");
  const [watermark, setWatermark] = useState("false");

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState<Set<string>>(new Set());

  // Multi-section prompt editor
  const [promptSections, setPromptSections] = useState({
    style: "",
    character: "",
    scene: "",
    storyboard: "",
    negative: "",
  });
  const [showBasics, setShowBasics] = useState(true);
  const [showNegative, setShowNegative] = useState(false);

  // Mention state (for all textareas)
  const mentionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionKeyRef = useRef<string>("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const mentionStartRef = useRef<number>(-1);

  // Quick phrase library
  const [phrases, setPhrases] = useState<string[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const sectionRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const lastFocusedRef = useRef<{ key: string; textarea: HTMLTextAreaElement } | null>(null);

  // Consume pending editor files from sidebar
  const pendingEditorFiles = useAppStore((s) => s.pendingEditorFiles);
  const clearPendingEditorFiles = useAppStore(
    (s) => s.clearPendingEditorFiles
  );

  useEffect(() => {
    if (pendingEditorFiles.length === 0) return;
    setAssets((prev) => [...prev, ...pendingEditorFiles]);
    clearPendingEditorFiles();
  }, [pendingEditorFiles, clearPendingEditorFiles]);

  const fetchJobs = useCallback(async () => {
    const res = await fetch(`/api/jobs?projectId=${id}`);
    const data = await res.json();
    const parsed = data.map((j: any) => ({
      ...j,
      params: typeof j.params === "string" ? JSON.parse(j.params || "{}") : j.params,
    }));
    setJobs(parsed);
    return parsed;
  }, [id]);

  // Keep a stable ref to fetchJobs for the polling interval
  const fetchJobsRef = useRef(fetchJobs);
  fetchJobsRef.current = fetchJobs;

  useEffect(() => {
    fetchJobs().then((parsed) => {
      const running = parsed
        .filter((j: any) => j.status === "running" || j.status === "pending")
        .map((j: any) => j.id);
      if (running.length > 0) {
        setPolling((prev) => new Set([...prev, ...running]));
      }
    });
  }, [fetchJobs]);

  // Load quick phrases from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const phraseSetting = data.find((s: any) => s.key === "PROMPT_PHRASES");
        if (phraseSetting?.value) {
          try {
            const parsed = JSON.parse(phraseSetting.value);
            if (Array.isArray(parsed)) setPhrases(parsed);
          } catch {
            // ignore parse error
          }
        }
      });
  }, []);

  // Poll running jobs via query endpoint
  const pollingRef = useRef(polling);
  pollingRef.current = polling;
  useEffect(() => {
    if (polling.size === 0) return;
    const interval = setInterval(async () => {
      const currentPolling = pollingRef.current;
      const pending: string[] = [];
      currentPolling.forEach((jobId) => pending.push(jobId));
      const toRemove = new Set<string>();
      await Promise.all(
        pending.map(async (jobId) => {
          try {
            const res = await fetch(`/api/jobs/${jobId}/query`, {
              method: "POST",
            });
            if (!res.ok) {
              toRemove.add(jobId);
            }
          } catch {
            toRemove.add(jobId);
          }
        })
      );
      const updated = await fetchJobsRef.current();
      const stillRunning = new Set<string>();
      currentPolling.forEach((jobId) => {
        if (toRemove.has(jobId)) return;
        const job = updated.find((j: any) => j.id === jobId);
        if (job && job.status !== "completed" && job.status !== "failed") {
          stillRunning.add(jobId);
        }
      });
      setPolling(stillRunning);
    }, 30000);
    return () => clearInterval(interval);
  }, [polling]);

  const imageAssets = assets.filter((a) => a.type === "image");
  const videoAssets = assets.filter((a) => a.type === "video");
  const audioAssets = assets.filter((a) => a.type === "audio");

  const mentionOptions = useMemo(() => {
    const options: { label: string; value: string; type: string; url?: string }[] = [];
    imageAssets.forEach((asset, i) => {
      if (!asset.frozen) {
        options.push({ label: `图片${i + 1}`, value: `@图片${i + 1}`, type: "image", url: asset.url });
      }
    });
    videoAssets.forEach((asset, i) => {
      if (!asset.frozen) {
        options.push({ label: `视频${i + 1}`, value: `@视频${i + 1}`, type: "video", url: asset.url });
      }
    });
    audioAssets.forEach((asset, i) => {
      if (!asset.frozen) {
        options.push({ label: `音频${i + 1}`, value: `@音频${i + 1}`, type: "audio", url: asset.url });
      }
    });
    return options.filter((o) => o.label.includes(mentionQuery));
  }, [imageAssets, videoAssets, audioAssets, mentionQuery]);

  useEffect(() => {
    if (mentionOpen) {
      setMentionIndex(0);
    }
  }, [mentionOptions.length, mentionOpen]);

  function handleSectionChange(
    key: string,
    value: string,
    textarea: HTMLTextAreaElement
  ) {
    setPromptSections((prev) => ({ ...prev, [key]: value }));

    const cursor = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionQuery(textAfterAt);
        mentionStartRef.current = atIndex;
        mentionTextareaRef.current = textarea;
        mentionKeyRef.current = key;
        const coords = getCaretCoordinates(textarea, cursor);
        const rect = textarea.getBoundingClientRect();
        setMentionPos({
          top: rect.top + coords.top - 4,
          left: rect.left + coords.left,
        });
        setMentionOpen(true);
        return;
      }
    }

    setMentionOpen(false);
    mentionStartRef.current = -1;
  }

  function insertMention(option: { label: string; value: string }) {
    const textarea = mentionTextareaRef.current;
    const key = mentionKeyRef.current;
    if (!textarea || !key || mentionStartRef.current === -1) return;
    const value = textarea.value;
    const before = value.slice(0, mentionStartRef.current);
    const after = value.slice(textarea.selectionStart);
    const newValue = before + option.value + after;
    setPromptSections((prev) => ({ ...prev, [key]: newValue }));
    setMentionOpen(false);
    mentionStartRef.current = -1;
    const pos = before.length + option.value.length;
    requestAnimationFrame(() => {
      textarea.setSelectionRange(pos, pos);
      textarea.focus();
    });
  }

  function handleMentionKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || mentionOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex(
        (i) => (i - 1 + mentionOptions.length) % mentionOptions.length
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(mentionOptions[mentionIndex]);
    } else if (e.key === "Escape") {
      setMentionOpen(false);
    }
  }

  async function uploadFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAssets: UploadedAsset[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          const type = file.type.startsWith("video/")
            ? "video"
            : file.type.startsWith("audio/")
            ? "audio"
            : "image";
          newAssets.push({
            id: `${Date.now()}-${Math.random()}`,
            url: data.url,
            type,
            name: file.name,
          });
        } else {
          toast.error(`${file.name} 上传失败`);
        }
      } catch {
        toast.error(`${file.name} 上传失败`);
      }
    }

    setAssets((prev) => [...prev, ...newAssets]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(e.target.files);
  }

  function isSupportedFileType(type: string): boolean {
    return (
      type.startsWith("image/") ||
      type.startsWith("video/") ||
      type.startsWith("audio/")
    );
  }

  function checkDragFiles(e: React.DragEvent): "none" | "valid" | "invalid" {
    const types = Array.from(e.dataTransfer.types || []);
    if (!types.includes("Files")) return "none";
    const items = Array.from(e.dataTransfer.items || []).filter(
      (item) => item.kind === "file"
    );
    if (items.length === 0) return "none";
    const allSupported = items.every((item) =>
      isSupportedFileType(item.type)
    );
    return allSupported ? "valid" : "invalid";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      const result = checkDragFiles(e);
      if (result !== "none") {
        setDragState(result);
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = checkDragFiles(e);
    if (result === "none") return;
    setDragState(result);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragState("idle");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragState("idle");
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      isSupportedFileType(file.type)
    );
    if (files.length === 0) {
      toast.error("不支持的文件格式");
      return;
    }
    uploadFiles(files);
  }

  function removeAsset(assetId: string) {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }

  function toggleFreeze(assetId: string) {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, frozen: !a.frozen } : a))
    );
  }

  function getFrozenMentions(assets: UploadedAsset[]): string[] {
    const typeLabels: Record<string, string> = {
      image: "图片",
      video: "视频",
      audio: "音频",
    };
    const mentions: string[] = [];
    const byType: Record<string, UploadedAsset[]> = {
      image: assets.filter((a) => a.type === "image"),
      video: assets.filter((a) => a.type === "video"),
      audio: assets.filter((a) => a.type === "audio"),
    };
    assets.forEach((a) => {
      if (a.frozen) {
        const list = byType[a.type];
        const idx = list.findIndex((x) => x.id === a.id);
        if (idx !== -1) {
          mentions.push(`@${typeLabels[a.type]}${idx + 1}`);
        }
      }
    });
    return mentions;
  }

  function mergePrompt(sections: typeof promptSections) {
    const parts: string[] = [];
    if (sections.style.trim()) parts.push(sections.style.trim());
    if (sections.character.trim()) parts.push(sections.character.trim());
    if (sections.scene.trim()) parts.push(sections.scene.trim());
    if (sections.storyboard.trim()) parts.push(sections.storyboard.trim());
    let positive = parts.join("。");

    // Remove frozen asset mentions
    const frozenMentions = getFrozenMentions(assets);
    frozenMentions.forEach((m) => {
      positive = positive.replace(new RegExp(m, "g"), "");
    });
    // Clean up extra punctuation
    positive = positive
      .replace(/。+/g, "。")
      .replace(/，+/g, "，")
      .replace(/。$/, "")
      .trim();

    if (sections.negative.trim()) {
      return `${positive}。避免：${sections.negative.trim()}`;
    }
    return positive;
  }

  async function handleGenerate() {
    const mergedPrompt = mergePrompt(promptSections);
    if (!mergedPrompt.trim() && assets.length === 0) {
      toast.error("请输入提示词或上传素材");
      return;
    }
    setLoading(true);

    const params = {
      prompt: mergedPrompt.trim(),
      promptSections,
      model,
      ratio,
      duration: Number(duration),
      resolution,
      generate_audio: generateAudio === "true",
      watermark: watermark === "true",
      assets,
    };

    const createRes = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: id,
        type: "reference",
        params,
      }),
    });
    const job = await createRes.json();

    if (!createRes.ok) {
      toast.error(errMsg(job.error, "创建任务失败"));
      setLoading(false);
      return;
    }

    setJobs((prev) => [{ ...job, params }, ...prev]);
    setMentionOpen(false);
    setPolling((prev) => new Set(prev).add(job.id));

    const genRes = await fetch(`/api/jobs/${job.id}/generate`, { method: "POST" });
    const genData = await genRes.json();

    setLoading(false);

    if (!genRes.ok) {
      toast.error(errMsg(genData.error, "调用生成API失败"));
      setPolling((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      fetchJobs();
      return;
    }

    if (genData.mock) {
      toast.success("已启动模拟生成（5秒后完成）");
    } else {
      toast.success("生成任务已提交");
    }
  }

  async function retryJob(jobId: string) {
    setPolling((prev) => new Set(prev).add(jobId));
    const genRes = await fetch(`/api/jobs/${jobId}/generate`, { method: "POST" });
    const genData = await genRes.json();
    if (!genRes.ok) {
      toast.error(errMsg(genData.error, "重试失败"));
      setPolling((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    } else {
      toast.success("已重新提交生成");
    }
  }

  async function removeJob(jobId: string) {
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("已清理");
    } else {
      toast.error("清理失败");
    }
  }

  // Quick phrase helpers
  async function savePhrases(next: string[]) {
    setPhrases(next);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "PROMPT_PHRASES", value: JSON.stringify(next) }),
    });
  }

  function addPhrase() {
    const text = newPhrase.trim();
    if (!text) return;
    if (phrases.includes(text)) {
      toast.error("该短语已存在");
      return;
    }
    savePhrases([...phrases, text]);
    setNewPhrase("");
  }

  function removePhrase(text: string) {
    savePhrases(phrases.filter((p) => p !== text));
  }

  function insertPhrase(phrase: string) {
    const targetKey = lastFocusedRef.current?.key || "storyboard";
    const textarea = sectionRefs.current[targetKey];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = promptSections[targetKey as keyof typeof promptSections];
    const before = current.slice(0, start);
    const after = current.slice(end);
    const newValue = before + phrase + after;
    setPromptSections((prev) => ({ ...prev, [targetKey]: newValue }));

    requestAnimationFrame(() => {
      const pos = start + phrase.length;
      textarea.setSelectionRange(pos, pos);
      textarea.focus();
    });
  }

  function onSectionFocus(
    key: string,
    textarea: HTMLTextAreaElement
  ) {
    lastFocusedRef.current = { key, textarea };
  }

  const [previewJob, setPreviewJob] = useState<any>(null);

  async function downloadResult(url: string, filename?: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || `opencinema-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success("下载已开始");
    } catch {
      toast.error("下载失败");
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Generator area */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="space-y-4">
            {/* Mode label */}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
                全能参考
              </span>
            </div>

            {/* Asset upload area */}
            <div className="flex items-center gap-3">
              {imageAssets.length > 0 && (
                <div className="flex items-center gap-2">
                  {imageAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={cn(
                        "group relative h-16 w-16 overflow-hidden rounded-lg border bg-muted transition-all",
                        asset.frozen && "opacity-50"
                      )}
                    >
                      <SafeImage
                        src={asset.url}
                        alt={asset.name}
                        fill
                        className={cn(
                          "object-contain transition-all",
                          asset.frozen && "grayscale"
                        )}
                      />
                      {/* Freeze toggle */}
                      <button
                        onClick={() => toggleFreeze(asset.id)}
                        className="absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-blue-500 text-white opacity-0 shadow transition-opacity hover:bg-blue-600 group-hover:opacity-100"
                        title={asset.frozen ? "解冻" : "冻结"}
                      >
                        <Snowflake className="h-2.5 w-2.5" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-destructive text-white opacity-0 shadow transition-opacity hover:bg-destructive/90 group-hover:opacity-100"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                      {/* Frozen indicator */}
                      {asset.frozen && (
                        <div className="absolute inset-0 z-0 flex items-center justify-center bg-black/20">
                          <Snowflake className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {videoAssets.length > 0 && (
                <div className="flex items-center gap-2">
                  {videoAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={cn(
                        "group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted transition-all",
                        asset.frozen && "opacity-50"
                      )}
                    >
                      <Film className={cn("h-6 w-6 text-muted-foreground transition-all", asset.frozen && "grayscale")} />
                      <button
                        onClick={() => toggleFreeze(asset.id)}
                        className="absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-blue-500 text-white opacity-0 shadow transition-opacity hover:bg-blue-600 group-hover:opacity-100"
                        title={asset.frozen ? "解冻" : "冻结"}
                      >
                        <Snowflake className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-destructive text-white opacity-0 shadow transition-opacity hover:bg-destructive/90 group-hover:opacity-100"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                      {asset.frozen && (
                        <div className="absolute inset-0 z-0 flex items-center justify-center bg-black/20">
                          <Snowflake className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {audioAssets.length > 0 && (
                <div className="flex items-center gap-2">
                  {audioAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={cn(
                        "group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted transition-all",
                        asset.frozen && "opacity-50"
                      )}
                    >
                      <Music className={cn("h-6 w-6 text-muted-foreground transition-all", asset.frozen && "grayscale")} />
                      <button
                        onClick={() => toggleFreeze(asset.id)}
                        className="absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-blue-500 text-white opacity-0 shadow transition-opacity hover:bg-blue-600 group-hover:opacity-100"
                        title={asset.frozen ? "解冻" : "冻结"}
                      >
                        <Snowflake className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-destructive text-white opacity-0 shadow transition-opacity hover:bg-destructive/90 group-hover:opacity-100"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                      {asset.frozen && (
                        <div className="absolute inset-0 z-0 flex items-center justify-center bg-black/20">
                          <Snowflake className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <label
                className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-muted-foreground/30 text-[10px] text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:text-foreground"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="text-sm leading-none">+</span>
                    <span className="leading-none">添加</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>{/* end top full-width area */}

          <div className="flex gap-6">
            {/* Left column */}
            <div
              ref={dropZoneRef}
              className="relative w-2/3 space-y-4"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Multi-section prompt editor */}
          <div className="space-y-3">
            {/* 基础设定 */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowBasics((s) => !s)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>{showBasics ? "▲" : "▼"}</span>
                基础设定
              </button>
              {showBasics && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      风格控制
                    </label>
                    <Textarea
                      ref={(el) => {
                        sectionRefs.current["style"] = el;
                      }}
                      value={promptSections.style}
                      onChange={(e) =>
                        handleSectionChange("style", e.target.value, e.currentTarget)
                      }
                      onKeyDown={handleMentionKeyDown}
                      onFocus={(e) => onSectionFocus("style", e.currentTarget)}
                      placeholder="如：电影级光影、写实风格..."
                      rows={2}
                      className="resize-none rounded-lg border bg-background text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      角色设定
                    </label>
                    <Textarea
                      ref={(el) => {
                        sectionRefs.current["character"] = el;
                      }}
                      value={promptSections.character}
                      onChange={(e) =>
                        handleSectionChange("character", e.target.value, e.currentTarget)
                      }
                      onKeyDown={handleMentionKeyDown}
                      onFocus={(e) =>
                        onSectionFocus("character", e.currentTarget)
                      }
                      placeholder="如：年轻女性、长发、穿风衣..."
                      rows={2}
                      className="resize-none rounded-lg border bg-background text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      场景设计
                    </label>
                    <Textarea
                      ref={(el) => {
                        sectionRefs.current["scene"] = el;
                      }}
                      value={promptSections.scene}
                      onChange={(e) =>
                        handleSectionChange("scene", e.target.value, e.currentTarget)
                      }
                      onKeyDown={handleMentionKeyDown}
                      onFocus={(e) => onSectionFocus("scene", e.currentTarget)}
                      placeholder="如：城市天台、黄昏、霓虹灯..."
                      rows={2}
                      className="resize-none rounded-lg border bg-background text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 分镜脚本 */}
            <div className="relative space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                分镜脚本
              </label>
              <Textarea
                ref={(el) => {
                  sectionRefs.current["storyboard"] = el;
                }}
                value={promptSections.storyboard}
                onChange={(e) =>
                  handleSectionChange("storyboard", e.target.value, e.currentTarget)
                }
                onKeyDown={handleMentionKeyDown}
                onFocus={(e) =>
                  onSectionFocus("storyboard", e.currentTarget)
                }
                placeholder="描述镜头动作、画面变化... 支持 @ 引用上传的素材"
                rows={4}
                className="resize-none rounded-lg border bg-background text-base shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
              />
            </div>

            {/* 负面提示词 */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowNegative((s) => !s)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>{showNegative ? "▲" : "▼"}</span>
                负面提示词
              </button>
              {showNegative && (
                <Textarea
                  ref={(el) => {
                    sectionRefs.current["negative"] = el;
                  }}
                  value={promptSections.negative}
                  onChange={(e) =>
                    setPromptSections((prev) => ({
                      ...prev,
                      negative: e.target.value,
                    }))
                  }
                  onFocus={(e) =>
                    onSectionFocus("negative", e.currentTarget)
                  }
                  placeholder="不希望出现的内容，如：模糊、变形、多余手指..."
                  rows={2}
                  className="resize-none rounded-lg border bg-background text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-1"
                />
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            {/* Model dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <span className="flex cursor-pointer items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/80">
                  {modelOptions.find((m) => m.value === model)?.label}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {modelOptions.map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    onClick={() => setModel(o.value)}
                    className="cursor-pointer"
                  >
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-3">
              {/* Params summary popover */}
              <Popover>
                <PopoverTrigger>
                  <span className="flex cursor-pointer items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/80">
                    <RatioIcon ratio={ratio} />
                    <span>{ratio}</span>
                    <span className="text-muted-foreground">/</span>
                    <span>{duration}S</span>
                    <span className="text-muted-foreground">/</span>
                    <span>{resolution.toUpperCase()}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-80 bg-popover"
                  sideOffset={8}
                >
                  <div className="space-y-5 p-1">
                    {/* Duration */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>时长 {duration || 5}S</span>
                      </div>
                      <Slider
                        value={[Number(duration) || 4]}
                        min={4}
                        max={15}
                        step={1}
                        onValueChange={(v) => {
                          let next = 4;
                          if (Array.isArray(v) && typeof v[0] === "number" && !isNaN(v[0])) {
                            next = v[0];
                          } else if (typeof v === "number" && !isNaN(v)) {
                            next = v;
                          }
                          setDuration(String(next));
                        }}
                      />
                    </div>

                    {/* Ratio */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">比例</span>
                      <div className="grid grid-cols-5 gap-2">
                        {ratioOptions.map((o) => (
                          <button
                            key={o.value}
                            onClick={() => setRatio(o.value)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors",
                              ratio === o.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <RatioIcon ratio={o.value} />
                            <span className="text-[10px]">{o.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Resolution */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">画质</span>
                      <div className="flex flex-wrap gap-2">
                        {resolutionOptions.map((o) => (
                          <button
                            key={o.value}
                            onClick={() => setResolution(o.value)}
                            className={cn(
                              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                              resolution === o.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Audio toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">音频</span>
                      <div className="flex items-center gap-1 rounded-full bg-muted p-1">
                        <button
                          onClick={() => setGenerateAudio("true")}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            generateAudio === "true"
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          开启
                        </button>
                        <button
                          onClick={() => setGenerateAudio("false")}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            generateAudio === "false"
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          关闭
                        </button>
                      </div>
                    </div>

                    {/* Watermark toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">水印</span>
                      <Switch
                        checked={watermark === "true"}
                        onCheckedChange={(c) => setWatermark(String(c))}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={(!mergePrompt(promptSections).trim() && assets.length === 0) || loading}
                className="h-9 w-9 rounded-full p-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Drag overlay */}
          {dragState !== "idle" && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-xl">
              <div className="absolute inset-0 rounded-xl bg-primary/10 backdrop-blur-[2px]" />
              <div className="relative z-10 rounded-lg bg-background/90 px-6 py-4 text-center shadow-lg">
                <p className="text-sm font-medium text-foreground">
                  {dragState === "valid"
                    ? "拖拽到此处来添加参考素材"
                    : "该类型不支持添加为参考素材"}
                </p>
              </div>
            </div>
          )}
        </div>{/* end left column */}

        {/* Right column: Quick phrase library */}
        <div className="w-1/3">
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium">快捷短语</div>
            <div className="flex flex-wrap gap-2">
              {phrases.map((phrase) => (
                <span
                  key={phrase}
                  className="group inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs transition-colors hover:bg-muted/80"
                >
                  <button
                    type="button"
                    onClick={() => insertPhrase(phrase)}
                    className="cursor-pointer"
                  >
                    {phrase}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhrase(phrase)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1">
              <input
                type="text"
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPhrase();
                  }
                }}
                placeholder="添加短语..."
                className="h-8 flex-1 rounded-md border bg-background px-2 text-xs shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={addPhrase}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-colors hover:bg-muted"
              >
                +
              </button>
            </div>
          </div>
        </div>

      </div>{/* end flex row */}
    </div>{/* end container */}
  </div>{/* end generator area */}

      {/* Results area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            生成结果 ({jobs.length})
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card key={job.id} className="group overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  {job.status === "completed" && job.resultUrl ? (
                    <div
                      className="relative h-full w-full cursor-pointer"
                      onClick={() => setPreviewJob(job)}
                    >
                      {isVideoUrl(job.resultUrl) ? (
                        <video
                          src={job.resultUrl}
                          className="h-full w-full object-cover"
                          controls
                        />
                      ) : (
                        <SafeImage
                          src={job.resultUrl}
                          alt="result"
                          fill
                          className="object-cover"
                        />
                      )}
                      {/* Hover overlay with actions */}
                      <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/40 group-hover:flex">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewJob(job);
                          }}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadResult(
                              job.resultUrl,
                              `opencinema-${job.id.slice(-6)}.mp4`
                            );
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyLink(job.resultUrl);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeJob(job.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : job.status === "running" || job.status === "pending" ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-xs">生成中...</span>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8 opacity-30" />
                      <span className="text-xs">
                        {job.status === "completed" && !job.resultUrl
                          ? "无结果"
                          : "生成失败"}
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="space-y-2 p-3">
                  <div className="line-clamp-2 text-sm">
                    {job.params?.prompt || job.type}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {job.params?.model && (
                      <span>
                        {modelOptions.find((m) => m.value === job.params.model)
                          ?.label || job.params.model}
                      </span>
                    )}
                    {job.params?.ratio && (
                      <span>比例 {job.params.ratio}</span>
                    )}
                    {job.params?.duration != null && (
                      <span>时长 {job.params.duration}s</span>
                    )}
                    {job.params?.resolution && (
                      <span>{job.params.resolution}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        job.status === "completed" && job.resultUrl
                          ? "default"
                          : job.status === "failed" ||
                            (job.status === "completed" && !job.resultUrl)
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {job.status === "completed" && job.resultUrl
                        ? "已完成"
                        : job.status === "failed" ||
                          (job.status === "completed" && !job.resultUrl)
                        ? "失败"
                        : job.status === "running"
                        ? "生成中"
                        : "排队中"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {(job.status === "failed" ||
                        (job.status === "completed" && !job.resultUrl)) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-auto px-2 py-1 text-xs"
                          onClick={() => retryJob(job.id)}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          重试
                        </Button>
                      )}
                      {/* All jobs can be deleted */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto px-2 py-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => removeJob(job.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        删除
                      </Button>
                    </div>
                  </div>
                  {job.errorMsg && (
                    <div className="text-xs text-destructive">
                      {job.errorMsg}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {jobs.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground">
                还没有生成记录，在上方输入提示词开始创作
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mention dropdown — fixed position, works for all textareas */}
      {mentionOpen && mentionOptions.length > 0 && (
        <div
          className="fixed z-50 w-40 -translate-y-full rounded-lg border bg-popover p-1 shadow-md"
          style={{ top: mentionPos.top, left: mentionPos.left }}
        >
          <div className="px-2 py-1 text-xs text-muted-foreground">
            引用参考
          </div>
          {mentionOptions.map((option, idx) => (
            <button
              key={option.value}
              onClick={() => insertMention(option)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                idx === mentionIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              {option.type === "image" && option.url ? (
                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded">
                  <SafeImage
                    src={option.url}
                    alt={option.label}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : option.type === "image" ? (
                <ImageIcon className="h-4 w-4 shrink-0" />
              ) : option.type === "video" ? (
                <Film className="h-4 w-4 shrink-0" />
              ) : (
                <Music className="h-4 w-4 shrink-0" />
              )}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewJob} onOpenChange={(open) => !open && setPreviewJob(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" showCloseButton>
          <DialogTitle className="sr-only">
            预览生成结果
          </DialogTitle>
          <DialogDescription className="sr-only">
            {previewJob?.params?.prompt || "生成结果预览"}
          </DialogDescription>
          {previewJob?.resultUrl && (
            <div className="relative aspect-video w-full bg-black">
              {isVideoUrl(previewJob.resultUrl) ? (
                <video
                  src={previewJob.resultUrl}
                  className="h-full w-full"
                  controls
                  autoPlay
                />
              ) : (
                <SafeImage
                  src={previewJob.resultUrl}
                  alt="result"
                  fill
                  className="object-contain"
                />
              )}
            </div>
          )}
          {previewJob?.params?.prompt && (
            <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground">
              {previewJob.params.prompt}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
