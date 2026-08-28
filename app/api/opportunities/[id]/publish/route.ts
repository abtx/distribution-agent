import { NextResponse } from "@/lib/http";
import { publishZernioReply } from "@/lib/publishing";
import { repository } from "@/lib/repository";
import { z } from "zod";

const schema = z.object({ text: z.string().trim().min(1).max(1200) });
const activeReplies = new Set<string>();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Reply text is required" },
      { status: 400 },
    );
  const opportunity = (await repository.opportunities()).find(
    (item) => item.id === id,
  );
  if (!opportunity)
    return NextResponse.json(
      { error: "Opportunity not found" },
      { status: 404 },
    );
  if (opportunity.status !== "pending")
    return NextResponse.json(
      { error: opportunity.status === "posted" ? "This post has already been replied to" : "Only pending opportunities can be replied to" },
      { status: 409 },
    );
  if (activeReplies.has(id))
    return NextResponse.json(
      { error: "A reply to this post is already being sent" },
      { status: 409 },
    );
  activeReplies.add(id);
  try {
    const published = await publishZernioReply({
      postId: opportunity.reddit_post_id,
      text: parsed.data.text,
      platform: opportunity.source === "x_api" ? "x" : "reddit",
      subreddit: opportunity.subreddit,
    });
    const replyUrl = published.id
      ? opportunity.source === "x_api"
        ? `https://x.com/i/web/status/${published.id}`
        : `${opportunity.post_url.replace(/\/$/, "")}/comment/${published.id}/`
      : null;
    const updated = await repository.updateOpportunity(id, {
      status: "posted",
      edited_reply: parsed.data.text,
      metadata: {
        ...opportunity.metadata,
        published: {
          ...published,
          url: replyUrl,
          replied_at: new Date().toISOString(),
        },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publishing failed" },
      { status: 502 },
    );
  } finally {
    activeReplies.delete(id);
  }
}
