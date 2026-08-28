import { randomUUID } from "node:crypto";
import { NextResponse } from "@/lib/http";
import { z } from "zod";
import { repository } from "@/lib/repository";
import type { Product } from "@/lib/types";
const schema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string(),
  one_liner: z.string().min(1),
  categories: z.array(z.string()),
  audiences: z.array(z.string()),
  keywords: z.array(z.string()),
  status: z.enum(["active", "disabled", "archived"]),
  preferred_cta: z.string(),
  must_include: z.string(),
  notes: z.string(),
});
export async function GET() {
  return NextResponse.json(await repository.products());
}
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const now = new Date().toISOString();
  const p: Product = {
    id: randomUUID(),
    ...parsed.data,
    created_at: now,
    updated_at: now,
  };
  return NextResponse.json(await repository.addProduct(p), { status: 201 });
}
