import { NextResponse } from "next/server";
import { marketingStore } from "@/lib/marketingStore";
export async function GET() {
  const latest = (await marketingStore.strategies())[0];
  if (!latest)
    return NextResponse.json(
      { error: "No marketing strategy has been saved" },
      { status: 404 },
    );
  return NextResponse.json({
    name: latest.name,
    content: latest.content,
    updated_at: latest.updated_at,
  });
}
