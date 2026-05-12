import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

const BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

export async function GET() {
  const apiKey = await getSetting("DREAMINA_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { valid: false, error: "API Key 未配置" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${BASE_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (res.ok) {
      return NextResponse.json({ valid: true });
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { valid: false, error: "API Key 无效或已过期" },
        { status: 200 }
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      { valid: false, error: data.error?.message || `HTTP ${res.status}` },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "请求失败";
    return NextResponse.json(
      { valid: false, error: `网络错误: ${message}` },
      { status: 200 }
    );
  }
}
