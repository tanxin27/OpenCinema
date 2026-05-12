import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { callDreaminaApi } from "@/lib/dreamina";

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
  const taskId = parsedParams.dreaminaTaskId;

  // Mock mode: just return current job status without querying external API
  const mockDreamina = await getSetting("MOCK_DREAMINA");
  if (mockDreamina === "true") {
    return NextResponse.json({ status: job.status, mock: true });
  }

  if (!taskId) {
    return NextResponse.json({ error: "No task id" }, { status: 400 });
  }

  const apiKey = await getSetting("DREAMINA_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { error: "DREAMINA_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { ok, data } = await callDreaminaApi({
      apiKey,
      endpoint: `/contents/generations/tasks/${taskId}`,
      method: "GET",
    });

    if (!ok) {
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

    // Map Seedance statuses to internal statuses
    // Seedance states: queued, running, succeeded, failed, cancelled
    const taskStatus = data.status || data.task_status;
    let internalStatus = job.status;
    let resultUrl = job.resultUrl;

    if (taskStatus === "succeeded") {
      internalStatus = "completed";
      // Try to extract result URL from common response shapes
      const content = data.content || data.result?.content;
      if (Array.isArray(content) && content.length > 0) {
        const first = content[0];
        resultUrl =
          first.url ||
          first.file_url ||
          first.video_url ||
          first.image_url ||
          first.video_url?.url ||
          first.image_url?.url ||
          resultUrl;
      } else if (content && typeof content === "object") {
        // content can be an object like { video_url: "..." }
        resultUrl =
          content.video_url || content.image_url || content.url || resultUrl;
      } else if (data.result?.url) {
        resultUrl = data.result.url;
      } else if (data.url) {
        resultUrl = data.url;
      }
      // If status says succeeded but we still have no URL, treat as failed
      if (!resultUrl) {
        internalStatus = "failed";
      }
    } else if (taskStatus === "failed" || taskStatus === "cancelled") {
      internalStatus = "failed";
    } else if (taskStatus === "running") {
      internalStatus = "running";
    } else if (taskStatus === "queued") {
      internalStatus = "pending";
    } else {
      // Unknown or missing task status: treat as failed
      internalStatus = "failed";
    }

    const shouldClearError = internalStatus === "completed";
    if (
      internalStatus !== job.status ||
      resultUrl !== job.resultUrl ||
      shouldClearError
    ) {
      await prisma.job.update({
        where: { id },
        data: {
          status: internalStatus,
          resultUrl,
          errorMsg: shouldClearError
            ? null
            : internalStatus === "failed"
            ? data.error?.message || JSON.stringify(data)
            : job.errorMsg,
        },
      });
    }

    return NextResponse.json({ status: internalStatus, taskId, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
