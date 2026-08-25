import { randomUUID } from "node:crypto";
import { NextResponse } from "@/lib/http";
import { z } from "zod";
import { marketingStore } from "@/lib/marketingStore";
import type { StrategyDocument } from "@/lib/types";
const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  content: z.string().min(1),
});
export async function GET() {
  return NextResponse.json(await marketingStore.strategies());
}
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const now = new Date().toISOString(),
    existing = (await marketingStore.strategies()).find(
      (x) => x.id === parsed.data.id,
    );
  const doc: StrategyDocument = {
    id: parsed.data.id || randomUUID(),
    name: parsed.data.name,
    content: parsed.data.content,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
  return NextResponse.json(await marketingStore.saveStrategy(doc), {
    status: existing ? 200 : 201,
  });
}
