import { z } from "zod";
import { NextResponse } from "@/lib/http";
import { marketingStore } from "@/lib/marketingStore";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = z.object({ enabled: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid source update" }, { status: 400 });
  const result = await marketingStore.updateDiscoverySource((await params).id, parsed.data);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Source not found" }, { status: 404 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const removed = await marketingStore.removeDiscoverySource((await params).id);
  return removed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Source not found" }, { status: 404 });
}
