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

  it("regenerates replies for products saved before must_include existed", async () => {
    delete process.env.OPENAI_API_KEY;
    const legacyProduct = {
      ...seedProducts[0],
      must_include: undefined as unknown as string,
    };

    await expect(generateReply(post, [legacyProduct])).resolves.toContain(
      legacyProduct.url,
    );
  });

  it("keeps product copy separate, complete, and limited to ordinary hyphens", async () => {
    delete process.env.OPENAI_API_KEY;
    const products = [
      {
        ...seedProducts[0],
        url: "https://www.reelblocks.app/",
        description:
          "ReelBlocks is a desktop video editor built for creators who want to get from raw footage to finished video fast — without fighting a traditional editing interface.\n\nInstead of forcing everything into a rigid timeline surrounded by panels, tracks and modes, ReelBlocks gives you a visual workflow.",
      },
      {
        ...seedProducts[1],
        url: "https://fluentish.xyz",
        description:
          "Talk naturally in the language you're learning, then Fluentish finds your mistakes and turns them into flashcards so you can practise exactly what you got wrong.",
      },
    ];

    const reply = await generateReply(post, products);

    expect(reply).toContain(
      "• ReelBlocks - a desktop video editor built for creators who want to get from raw footage to finished video fast - without fighting a traditional editing interface.\nDownload FREE at https://www.reelblocks.app/",
    );
    expect(reply).toContain(
      "• Fluentish - talk naturally in the language you're learning, then Fluentish finds your mistakes and turns them into flashcards so you can practise exactly what you got wrong.\nDownload FREE at https://fluentish.xyz",
    );
    expect(reply).toContain(
      "https://www.reelblocks.app/\n\n• Fluentish",
    );
    expect(reply).not.toContain("https://www.reelblocks.app/\n\n\n");
    expect(reply).not.toContain("Instead of forcing everything");
    expect(reply).not.toMatch(/[—–]/);
    expect(reply).not.toContain("which one is most useful");
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
    expect(reply).toContain(`Download FREE at ${seedProducts[1].url}`);
    expect(reply).not.toContain("—");
  });
});
