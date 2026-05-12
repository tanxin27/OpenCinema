import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { mkdir } from "fs/promises";
import { uploadFileToTos } from "@/lib/tos";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Save to temp location
  const tmpDir = path.join(process.cwd(), "tmp", "tos-upload");
  await mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${Date.now()}-${file.name}`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpPath, buffer);

    // Upload to TOS
    const objectKey = `opencinema/${Date.now()}-${file.name}`;
    const publicUrl = await uploadFileToTos(tmpPath, objectKey, file.type);

    // Clean up temp file
    await unlink(tmpPath);

    return NextResponse.json({ url: publicUrl, key: objectKey });
  } catch (err: any) {
    // Clean up temp file on error
    try {
      await unlink(tmpPath);
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: err.message || "Upload to TOS failed" },
      { status: 500 }
    );
  }
}
