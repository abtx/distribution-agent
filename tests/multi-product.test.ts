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

  it("follows the field order and headings requested by the Reddit post", async () => {
    delete process.env.OPENAI_API_KEY;
    const formattedPost = {
      ...post,
      body: `Please follow this format:\n\nStartup Name / URL\n\nLocation\n\nElevator pitch\n\nMore details\n\nGoals this month\n\nHow could r/startups help?\n\nDiscount for r/startups subscribers`,
    };

    const reply = await generateReply(formattedPost, [seedProducts[1]]);

    const headings = [
      "Startup Name / URL",
      "Location",
      "Elevator pitch",
      "More details",
      "Goals this month",
      "How could r/startups help?",
      "Discount for r/startups subscribers",
    ];
    const positions = headings.map((heading) => reply.indexOf(heading));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(reply).toContain(`Startup Name / URL\nFluentish / ${seedProducts[1].url}`);
    expect(reply).toContain("Location\nOnline");
    expect(reply).toContain(seedProducts[1].one_liner);
    expect(reply).toContain(seedProducts[1].description);
    expect(reply).not.toContain("—");
  });
});
