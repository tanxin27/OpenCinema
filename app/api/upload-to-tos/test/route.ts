import { NextResponse } from "next/server";
import { createTosClient, getTosConfig } from "@/lib/tos";

export async function GET() {
  try {
    const config = await getTosConfig();
    if (!config) {
      return NextResponse.json(
        { error: "TOS not configured" },
        { status: 400 }
      );
    }

    const client = await createTosClient();
    // Try a simple listObjects to verify connectivity
    await client.listObjects({
      bucket: config.bucket,
      maxKeys: 1,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "TOS connection failed" },
      { status: 500 }
    );
  }
}
