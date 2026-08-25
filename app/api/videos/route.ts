import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
const maxSize = 500 * 1024 * 1024;
export async function POST(req: Request) {
  const form = await req.formData(),
    file = form.get("video");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Choose a video file" }, { status: 400 });
  if (!file.type.startsWith("video/"))
    return NextResponse.json(
      { error: "Only video files are accepted" },
      { status: 400 },
    );
  if (file.size > maxSize)
    return NextResponse.json(
      { error: "Video must be smaller than 500 MB" },
      { status: 413 },
    );
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${randomUUID()}-${safe}`,
    dir = path.join(process.cwd(), ".data", "videos");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, filename),
    Buffer.from(await file.arrayBuffer()),
  );
  return NextResponse.json(
    {
      name: file.name,
      url: `/api/videos/${filename}`,
      size: file.size,
      type: file.type,
    },
    { status: 201 },
  );
}
