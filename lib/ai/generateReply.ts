import OpenAI from "openai";
import { replySchema } from "./schemas";
import type { Product, RedditPost } from "../types";
export async function generateReply(post: RedditPost, products: Product[]) {
  if (!products.length) throw new Error("At least one product is required");
  if (!process.env.OPENAI_API_KEY) {
    const positioning = (product: Product) =>
      (product.description.trim() || product.one_liner).slice(0, 240);
    return products.length === 1
      ? `I’m building ${products[0].name} — ${positioning(products[0])} ${products[0].preferred_cta}: ${products[0].url}`
      : `I’m building a couple of things:\n\n${products.map((product) => `• ${product.name} — ${positioning(product)} ${product.url}`).join("\n")}\n\nI’d love to hear which one is most useful to you.`;
  }
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 15000,
    maxRetries: 2,
  });
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Write one short human Reddit reply as JSON {reply}. Contextual, factual, no hashtags, no fake claims, no hype. Mention being the builder and naturally combine every supplied product with its link. Do not imply the products are one product.",
      },
      { role: "user", content: JSON.stringify({ post, products }) },
    ],
  });
  return replySchema.parse(JSON.parse(r.choices[0]?.message.content || "{}"))
    .reply;
}
