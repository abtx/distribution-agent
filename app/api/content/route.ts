import { randomUUID } from "node:crypto";
import { NextResponse } from "@/lib/http";
import { z } from "zod";
import { marketingStore } from "@/lib/marketingStore";
import type { ContentItem } from "@/lib/types";
const channel = z.enum([
  "x",
  "reddit",
  "youtube",
  "tiktok",
  "instagram",
  "linkedin",
]);
const schema = z.object({
  kind: z.enum(["post", "video"]),
  title: z.string().min(1),
  body: z.string().default(""),
  product_id: z.string().nullable().default(null),
  channels: z.array(channel).min(1),
  targets: z.array(z.string()).default([]),
  asset_name: z.string().nullable().default(null),
  asset_url: z.string().nullable().default(null),
  status: z
    .enum(["draft", "scheduled", "queued", "published", "failed"])
    .default("draft"),
  scheduled_at: z.string().datetime().nullable().default(null),
});
export async function GET() {
  return NextResponse.json(await marketingStore.allContent());
}
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  if (
    parsed.data.kind === "post" &&
    parsed.data.channels.some((c) => !["x", "reddit"].includes(c))
  )
    return NextResponse.json(
      { error: "Text posts currently support X and Reddit" },
      { status: 400 },
    );
  if (parsed.data.kind === "video" && !parsed.data.asset_url)
    return NextResponse.json(
      { error: "Select a video before creating the batch" },
      { status: 400 },
    );
  const now = new Date().toISOString(),
    item: ContentItem = {
      id: randomUUID(),
      ...parsed.data,
      publications: {},
      created_at: now,
      updated_at: now,
    };
  return NextResponse.json(await marketingStore.addContent(item), {
    status: 201,
  });
}
