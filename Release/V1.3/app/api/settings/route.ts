import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SENSITIVE_KEYS = ["DREAMINA_API_KEY"];

function maskValue(key: string, value: string): string {
  if (!SENSITIVE_KEYS.includes(key) || !value) return value;
  if (value.length <= 8) return "****";
  return value.slice(0, 4) + "****" + value.slice(-4);
}

export async function GET() {
  const settings = await prisma.setting.findMany();
  const safe = settings.map((s) => ({
    key: s.key,
    value: maskValue(s.key, s.value),
    masked: SENSITIVE_KEYS.includes(s.key),
    exists: !!s.value,
  }));
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { key, value } = body;
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }
  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value: value ?? "" },
    create: { key, value: value ?? "" },
  });
  return NextResponse.json({
    key: setting.key,
    value: maskValue(setting.key, setting.value),
    masked: SENSITIVE_KEYS.includes(setting.key),
    exists: !!setting.value,
  });
}
