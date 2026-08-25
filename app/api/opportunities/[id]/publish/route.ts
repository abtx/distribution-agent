import { NextResponse } from "@/lib/http";
import { publishRedditComment } from "@/lib/publishing";
import { repository } from "@/lib/repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const opportunity = (await repository.opportunities()).find(
    (item) => item.id === id,
  );
  if (!opportunity)
    return NextResponse.json(
      { error: "Opportunity not found" },
      { status: 404 },
    );
  if (opportunity.status !== "approved")
    return NextResponse.json(
      { error: "Approve the reply before publishing" },
      { status: 409 },
    );
  const text = opportunity.edited_reply || opportunity.proposed_reply;
  try {
    const published = await publishRedditComment(
      opportunity.reddit_post_id,
      text,
    );
    const updated = await repository.updateOpportunity(id, {
      status: "posted",
      metadata: { ...opportunity.metadata, published },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publishing failed" },
      { status: 502 },
    );
  }
}
