import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

const BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

async function proxyRequest(
  req: NextRequest,
  method: "GET" | "POST" | "DELETE",
  bodyEndpoint?: string
) {
  const apiKey = await getSetting("DREAMINA_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { error: "DREAMINA_API_KEY not configured. Please set it in Settings." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || bodyEndpoint;
  if (!endpoint) {
    return NextResponse.json(
      { error: "endpoint is required" },
      { status: 400 }
    );
  }

  // Build target URL with all original search params
  const target = new URL(`${BASE_URL}${endpoint}`);
  searchParams.forEach((value, key) => {
    if (key !== "endpoint") {
      target.searchParams.append(key, value);
    }
  });

  try {
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (method === "POST") {
      const body = await req.json().catch(() => ({}));
      init.body = JSON.stringify(body.payload || body || {});
    }

    const res = await fetch(target.toString(), init);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.clone().json().catch(() => ({}));
  return proxyRequest(req, "POST", body.endpoint);
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, "GET");
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req, "DELETE");
}
