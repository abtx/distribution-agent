import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "@/lib/http";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (filename !== path.basename(filename))
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  try {
    const data = await readFile(
      path.join(process.cwd(), ".data", "videos", filename),
    );
    return new NextResponse(data, {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
}
