import { NextResponse } from "next/server";
import { z } from "zod";
import { marketingStore } from "@/lib/marketingStore";
const schema = z.object({
  status: z
    .enum(["draft", "scheduled", "queued", "published", "failed"])
    .optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  channels: z
    .array(
      z.enum(["x", "reddit", "youtube", "tiktok", "instagram", "linkedin"]),
    )
    .min(1)
    .optional(),
  targets: z.array(z.string()).optional(),
});
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params,
    parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const item = await marketingStore.updateContent(id, parsed.data);
  return item
    ? NextResponse.json(item)
    : NextResponse.json({ error: "Content item not found" }, { status: 404 });
}
