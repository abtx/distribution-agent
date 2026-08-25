import { NextResponse } from "next/server";
import { z } from "zod";
import { repository } from "@/lib/repository";
const schema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "posted", "expired"])
    .optional(),
  edited_reply: z.string().min(1).max(1200).nullable().optional(),
});
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
  const o = await repository.updateOpportunity(id, parsed.data);
  return o
    ? NextResponse.json(o)
    : NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
}
