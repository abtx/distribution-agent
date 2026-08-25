import { NextResponse } from "next/server";
import { repository } from "@/lib/repository";
import { z } from "zod";
const schema = z
  .object({
    name: z.string().min(1),
    url: z.string().url(),
    description: z.string(),
    one_liner: z.string().min(1),
    categories: z.array(z.string()),
    audiences: z.array(z.string()),
    keywords: z.array(z.string()),
    status: z.enum(["active", "disabled", "archived"]),
    preferred_cta: z.string(),
    notes: z.string(),
  })
  .partial();
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const p = await repository.updateProduct(id, parsed.data);
  return p
    ? NextResponse.json(p)
    : NextResponse.json({ error: "Product not found" }, { status: 404 });
}
