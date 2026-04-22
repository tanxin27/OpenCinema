import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { readFile } from "fs/promises";
import path from "path";

const DEFAULT_MODEL = "doubao-seedance-2-0-260128";

function toDataUrl(mime: string, base64: string) {
  return `data:${mime};base64,${base64}`;
}

async function assetUrlToContentItem(
  url: string,
  typeHint: string
): Promise<any | null> {
  let finalUrl = url;

  // Convert local files to base64 data URLs so the external API can access them
  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url);
    const buffer = await readFile(filePath);
    const base64 = buffer.toString("base64");
    const ext = path.extname(url).toLowerCase();
    let mime = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
    else if (ext === ".png") mime = "image/png";
    else if (ext === ".gif") mime = "image/gif";
    else if (ext === ".webp") mime = "image/webp";
    else if (ext === ".mp4") mime = "video/mp4";
    else if (ext === ".mov") mime = "video/quicktime";
    else if (ext === ".webm") mime = "video/webm";
    else if (ext === ".mp3") mime = "audio/mpeg";
    else if (ext === ".wav") mime = "audio/wav";
    else if (ext === ".m4a") mime = "audio/mp4";
    else if (ext === ".ogg") mime = "audio/ogg";
    finalUrl = toDataUrl(mime, base64);
  }

  if (typeHint === "image") {
    return { type: "image_url", image_url: { url: finalUrl } };
  }
  if (typeHint === "video") {
    return { type: "video_url", video_url: { url: finalUrl } };
  }
  if (typeHint === "audio") {
    return { type: "audio_url", audio_url: { url: finalUrl } };
  }
  return null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsedParams = JSON.parse(job.params || "{}");

  // Mock mode for UI development
  const mockDreamina = await getSetting("MOCK_DREAMINA");
  if (mockDreamina === "true") {
    await prisma.job.update({
      where: { id },
      data: { status: "running" },
    });

    setTimeout(async () => {
      try {
        await prisma.job.update({
          where: { id },
          data: {
            status: "completed",
            resultUrl:
              "https://placehold.co/600x400/222/fff?text=Dreamina+Result",
          },
        });
      } catch {
        // ignore
      }
    }, 5000);

    return NextResponse.json({ status: "running", mock: true });
  }

  const apiKey = await getSetting("DREAMINA_API_KEY");
  if (!apiKey) {
    await prisma.job.update({
      where: { id },
      data: {
        status: "failed",
        errorMsg:
          "DREAMINA_API_KEY not configured. Please set it in Settings.",
      },
    });
    return NextResponse.json(
      {
        error:
          "DREAMINA_API_KEY not configured. Please set it in Settings.",
      },
      { status: 500 }
    );
  }

  // Build Seedance 2.0 content array
  const content: any[] = [];

  let promptText = parsedParams.prompt || "";
  // Convert @ references to official placeholders
  promptText = promptText.replace(/@图片(\d+)/g, "图片$1");
  promptText = promptText.replace(/@视频(\d+)/g, "视频$1");
  promptText = promptText.replace(/@音频(\d+)/g, "音频$1");

  if (promptText) {
    content.push({ type: "text", text: promptText });
  }

  const assets = parsedParams.assets || [];
  for (const asset of assets) {
    const item = await assetUrlToContentItem(asset.url, asset.type);
    if (item) content.push(item);
  }

  // Build payload
  const payload: any = {
    model: parsedParams.model || DEFAULT_MODEL,
    content,
  };

  if (parsedParams.ratio != null) payload.ratio = parsedParams.ratio;
  if (parsedParams.duration != null) payload.duration = parsedParams.duration;
  if (parsedParams.resolution != null)
    payload.resolution = parsedParams.resolution;
  if (parsedParams.generate_audio != null)
    payload.generate_audio = parsedParams.generate_audio;
  if (parsedParams.watermark != null) payload.watermark = parsedParams.watermark;

  // Call Dreamina proxy
  try {
    const res = await fetch("http://localhost:3000/api/dreamina", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "/contents/generations/tasks",
        payload,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg =
        typeof data === "object"
          ? data.error?.message || data.message || JSON.stringify(data)
          : String(data);
      await prisma.job.update({
        where: { id },
        data: { status: "failed", errorMsg },
      });
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const taskId = data.id || data.task_id;
    if (!taskId) {
      const errorMsg =
        typeof data === "object"
          ? data.error?.message || data.message || JSON.stringify(data)
          : "Create task failed: no task id returned";
      await prisma.job.update({
        where: { id },
        data: { status: "failed", errorMsg },
      });
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    await prisma.job.update({
      where: { id },
      data: {
        status: "running",
        params: JSON.stringify({
          ...parsedParams,
          dreaminaTaskId: taskId,
        }),
      },
    });

    return NextResponse.json({ status: "running", taskId });
  } catch (err: any) {
    await prisma.job.update({
      where: { id },
      data: { status: "failed", errorMsg: err.message },
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
