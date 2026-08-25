import { describe, expect, it } from "vitest";
import { heuristicClassification } from "@/lib/ai/classifyOpportunity";
import { generateReply } from "@/lib/ai/generateReply";
import { seedProducts } from "@/lib/seed";

const post = {
  id: "multi",
  subreddit: "SideProject",
  title: "What are you building?",
  body: "Drop your products and links",
  url: "https://reddit.com/test",
  author: "maker",
  createdUtc: new Date().toISOString(),
};

describe("multi-product opportunities", () => {
  it("matches every relevant active product for an open showcase", () => {
    const result = heuristicClassification(post, seedProducts);
    expect(result.productMatches.map((match) => match.productId)).toEqual(
      expect.arrayContaining(["reelblocks", "fluentish"]),
    );
  });

  it("generates a combined reply that identifies and links both products", async () => {
    delete process.env.OPENAI_API_KEY;
    const reply = await generateReply(post, seedProducts);
    expect(reply).toContain("ReelBlocks");
    expect(reply).toContain("Fluentish");
    expect(reply).toContain(seedProducts[0].url);
    expect(reply).toContain(seedProducts[1].url);
  });
});
