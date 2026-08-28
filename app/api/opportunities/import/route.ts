import { randomUUID } from "node:crypto";
import { z } from "zod";
import { classifyOpportunity } from "@/lib/ai/classifyOpportunity";
import { generateReply } from "@/lib/ai/generateReply";
import { NextResponse } from "@/lib/http";
import { repository } from "@/lib/repository";
import type { Opportunity, RedditPost } from "@/lib/types";
import { samePost } from "@/lib/opportunities/identity";

const schema = z.object({
  url: z.string().url(),
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().max(40000).default(""),
  author: z.string().trim().max(100).default("unknown"),
});

function parseRedditUrl(value: string) {
  const url = new URL(value);
  if (!(url.hostname === "reddit.com" || url.hostname.endsWith(".reddit.com")))
    throw new Error("Use a reddit.com post URL");
  const match = url.pathname.match(/^\/r\/([^/]+)\/comments\/([^/]+)/i);
  if (!match) throw new Error("Use the URL of a specific Reddit post");
  return { subreddit: decodeURIComponent(match[1]), postId: match[2] };
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  let location: ReturnType<typeof parseRedditUrl>;
  try { location = parseRedditUrl(parsed.data.url); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Reddit URL" }, { status: 400 }); }
  const incomingIdentity = {
    reddit_post_id: location.postId,
    post_url: parsed.data.url,
  };
  const existing = (await repository.opportunities()).find((item) =>
    samePost(item, incomingIdentity),
  );
  if (existing) return NextResponse.json({ error: "This Reddit post is already in the opportunity queue", opportunity_id: existing.id }, { status: 409 });
  const products = (await repository.products()).filter((item) => item.status === "active");
  const post: RedditPost = {
    id: location.postId, subreddit: location.subreddit, title: parsed.data.title,
    body: parsed.data.body, url: parsed.data.url, author: parsed.data.author || "unknown",
    createdUtc: new Date().toISOString(), platform: "reddit",
  };
  const classification = await classifyOpportunity(post, products);
  if (!classification.isPromotionOpportunity || !classification.promotionExplicitlyAllowed || classification.opportunityScore < 65 || classification.productMatchScore < 65 || !classification.bestProductId)
    return NextResponse.json({ error: "This post did not qualify as a safe, relevant promotion opportunity", reasoning: classification.reasoning }, { status: 422 });
  const matches = (classification.productMatches.length ? classification.productMatches : [{ productId: classification.bestProductId, score: classification.productMatchScore }])
    .filter((match) => match.score >= 65);
  const matchedProducts = matches.map((match) => products.find((product) => product.id === match.productId)).filter((product): product is (typeof products)[number] => Boolean(product));
  if (!matchedProducts.length) return NextResponse.json({ error: "No active product matched this post" }, { status: 422 });
  const now = new Date().toISOString();
  const opportunity: Opportunity = {
    id: randomUUID(), reddit_post_id: post.id, subreddit: post.subreddit,
    post_title: post.title, post_body: post.body, post_url: post.url,
    author: post.author, created_utc: post.createdUtc, discovered_at: now,
    score: classification.opportunityScore, reasoning: classification.reasoning,
    promotion_allowed: classification.promotionExplicitlyAllowed,
    matched_product_id: matchedProducts[0].id,
    matched_product_ids: matchedProducts.map((product) => product.id),
    product_matches: matches, match_score: classification.productMatchScore,
    proposed_reply: await generateReply(post, matchedProducts), edited_reply: null,
    status: "pending", source: "manual_browser_review",
    metadata: { confidence: classification.confidence, manually_imported: true },
    created_at: now, updated_at: now,
  };
  await repository.addOpportunity(opportunity);
  return NextResponse.json(opportunity, { status: 201 });
}
