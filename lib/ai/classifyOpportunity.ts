import OpenAI from "openai";
import { classificationSchema } from "./schemas";
import type { Classification, Product, RedditPost } from "../types";

export async function classifyOpportunity(
  post: RedditPost,
  products: Product[],
): Promise<Classification> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return heuristicClassification(post, products);
  const client = new OpenAI({ apiKey: key, timeout: 15000, maxRetries: 2 });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Conservatively identify Reddit posts that explicitly invite product promotion. Return JSON only with isPromotionOpportunity, promotionExplicitlyAllowed, confidence (0-1), opportunityScore (0-100), reasoning, bestProductId, productMatchScore (0-100), and productMatches (every relevant active product as {productId, score}, highest score first). Never choose an inactive product.",
      },
      {
        role: "user",
        content: JSON.stringify({
          post,
          products: products.map(
            ({
              id,
              name,
              one_liner,
              categories,
              audiences,
              keywords,
              status,
            }) => ({
              id,
              name,
              one_liner,
              categories,
              audiences,
              keywords,
              status,
            }),
          ),
        }),
      },
    ],
  });
  return classificationSchema.parse(
    JSON.parse(response.choices[0]?.message.content || "{}"),
  );
}
export function heuristicClassification(
  post: RedditPost,
  products: Product[],
): Classification {
  const text = `${post.title} ${post.body}`.toLowerCase();
  const invites =
    /(share|drop|showcase|show us|what are you building|what did you build|self.?promotion|post your|launch your)/.test(
      text,
    );
  const active = products.filter((p) => p.status === "active");
  const productMatches = active
    .map((p) => {
      const terms = [...p.keywords, ...p.categories, ...p.audiences]
        .flatMap((v) => v.toLowerCase().split(/\s+/))
        .filter((v) => v.length > 3);
      const hits = terms.filter((t) => text.includes(t)).length;
      return {
        productId: p.id,
        score: Math.min(96, invites ? 70 + hits * 5 : hits * 8),
      };
    })
    .filter((match) => match.score >= 65)
    .sort((a, b) => b.score - a.score);
  const best = productMatches[0];
  return {
    isPromotionOpportunity: invites,
    promotionExplicitlyAllowed: invites,
    confidence: invites ? 0.9 : 0.8,
    opportunityScore: invites
      ? Math.min(95, 72 + Math.round((post.comments || 0) / 2))
      : 20,
    reasoning: invites
      ? "The post explicitly invites builders to share their products; an active product is relevant to the audience."
      : "The post does not clearly invite product promotion.",
    bestProductId: best?.productId || null,
    productMatchScore: best?.score || 0,
    productMatches,
  };
}
