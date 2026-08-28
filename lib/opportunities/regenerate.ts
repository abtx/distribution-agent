import { classifyOpportunity } from "../ai/classifyOpportunity";
import { generateReply } from "../ai/generateReply";
import { repository } from "../repository";
import type { Opportunity, RedditPost } from "../types";

let regenerating = false;

function asPost(opportunity: Opportunity): RedditPost {
  return {
    id: opportunity.reddit_post_id,
    subreddit: opportunity.subreddit,
    title: opportunity.post_title,
    body: opportunity.post_body,
    url: opportunity.post_url,
    author: opportunity.author,
    createdUtc: opportunity.created_utc,
    platform: opportunity.source === "x_api" ? "x" : "reddit",
  };
}

export async function regenerateOpportunities() {
  if (regenerating)
    throw new Error("Opportunity regeneration is already in progress");
  regenerating = true;
  try {
    const [opportunities, products] = await Promise.all([
      repository.opportunities(),
      repository.products(),
    ]);
    const active = products.filter((product) => product.status === "active");
    let regenerated = 0;
    let expired = 0;

    for (const opportunity of opportunities) {
      // Published records are receipts of what was actually sent and are immutable.
      if (opportunity.status === "posted") continue;
      const classification = await classifyOpportunity(
        asPost(opportunity),
        active,
      );
      const matches = classification.productMatches.filter(
        (match) => match.productId && match.score >= 65,
      );
      const matchedProducts = matches
        .map((match) =>
          active.find((product) => product.id === match.productId),
        )
        .filter((product): product is (typeof active)[number] =>
          Boolean(product),
        );
      const eligible =
        classification.isPromotionOpportunity &&
        classification.promotionExplicitlyAllowed &&
        classification.opportunityScore >= 65 &&
        matchedProducts.length > 0;

      if (!eligible) {
        await repository.updateOpportunity(opportunity.id, {
          score: classification.opportunityScore,
          reasoning: classification.reasoning,
          promotion_allowed: classification.promotionExplicitlyAllowed,
          product_matches: matches,
          match_score: matches[0]?.score || 0,
          edited_reply: null,
          status: "expired",
        });
        expired++;
        continue;
      }

      const proposed_reply = await generateReply(
        asPost(opportunity),
        matchedProducts,
      );
      await repository.updateOpportunity(opportunity.id, {
        score: classification.opportunityScore,
        reasoning: classification.reasoning,
        promotion_allowed: classification.promotionExplicitlyAllowed,
        matched_product_id: matchedProducts[0].id,
        matched_product_ids: matchedProducts.map((product) => product.id),
        product_matches: matches,
        match_score: matches[0].score,
        proposed_reply,
        edited_reply: null,
        status: "pending",
      });
      regenerated++;
    }

    return { regenerated, expired, skipped: opportunities.length - regenerated - expired };
  } finally {
    regenerating = false;
  }
}
