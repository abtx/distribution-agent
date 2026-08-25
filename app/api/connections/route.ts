import { NextResponse } from "next/server";
import {
  connectionStore,
  safeConnection,
  type Platform,
} from "@/lib/connections";

export async function GET() {
  return NextResponse.json((await connectionStore.all()).map(safeConnection));
}
export async function DELETE(request: Request) {
  const platform = new URL(request.url).searchParams.get(
    "platform",
  ) as Platform | null;
  if (platform !== "reddit" && platform !== "x")
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  await connectionStore.remove(platform);
  return NextResponse.json({ ok: true });
}
