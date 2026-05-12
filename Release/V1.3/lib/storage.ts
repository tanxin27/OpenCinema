import { mkdir } from "fs/promises";
import { writeFile } from "fs/promises";
import { unlink } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.resolve(process.cwd(), "public");

export function getUploadPath(filename: string) {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dir = path.join(UPLOAD_ROOT, "uploads", yyyy, mm, dd);
  const url = `/uploads/${yyyy}/${mm}/${dd}/${filename}`;
  return { dir, url };
}

export async function saveUploadedFile(file: File) {
  const ext = path.extname(file.name) || "";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const { dir, url } = getUploadPath(filename);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return { url, size: buffer.length };
}

export async function deleteLocalFile(url: string) {
  try {
    const filePath = path.join(UPLOAD_ROOT, url.replace(/^\//, ""));
    await unlink(filePath);
  } catch {
    // ignore
  }
}
