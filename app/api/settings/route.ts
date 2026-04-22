import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SENSITIVE_KEYS = ["DREAMINA_API_KEY"];

export async function GET() {
  const settings = await prisma.setting.findMany();
  const safe = settings.map((s) => ({
    key: s.key,
    value: SENSITIVE_KEYS.includes(s.key) ? "***" : s.value,
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
  return NextResponse.json({ key: setting.key, value: "" });
}
