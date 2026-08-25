import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "@/lib/http";
import { marketingStore } from "@/lib/marketingStore";
import type { DiscoverySource } from "@/lib/types";

const sourceSchema = z.object({
  channel: z.enum(["reddit", "x"]),
  name: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(300).default("Added manually"),
});

function normalise(channel: "reddit" | "x", name: string) {
  return name.trim().replace(channel === "reddit" ? /^r\//i : /^@/, "");
}

export async function GET() {
  return NextResponse.json(await marketingStore.discoverySources());
}

export async function POST(request: Request) {
  const parsed = sourceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const source: DiscoverySource = {
    id: randomUUID(),
    channel: parsed.data.channel,
    name: normalise(parsed.data.channel, parsed.data.name),
    enabled: true,
    reason: parsed.data.reason,
    created_at: new Date().toISOString(),
  };
  return NextResponse.json(await marketingStore.addDiscoverySource(source), { status: 201 });
}
