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

  it("uses a singular founder closing for one product", async () => {
    delete process.env.OPENAI_API_KEY;

    const reply = await generateReply(post, [seedProducts[0]]);

    expect(reply).toMatch(/^I’m an indie founder working on this:/);
    expect(reply).toMatch(
      /Happy to share more about how I’m building it, and I’d genuinely appreciate any feedback\.$/,
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

    expect(reply).toMatch(
      /^I’m an indie founder working on a couple of products:\n\n/,
    );
    expect(reply).toContain(
      "• ReelBlocks - a desktop video editor built for creators who want to get from raw footage to finished video fast - without fighting a traditional editing interface.\nFREE download: https://www.reelblocks.app/",
    );
    expect(reply).toContain(
      "• Fluentish - talk naturally in the language you're learning, then Fluentish finds your mistakes and turns them into flashcards so you can practise exactly what you got wrong.\nFREE to use with ChatGPT: https://fluentish.xyz",
    );
    expect(reply).toContain(
      "https://www.reelblocks.app/\n\n• Fluentish",
    );
    expect(reply).not.toContain("https://www.reelblocks.app/\n\n\n");
    expect(reply).not.toContain("Instead of forcing everything");
    expect(reply).not.toMatch(/[—–]/);
    expect(reply).toMatch(/Happy to share more about how I’m building these, and I’d genuinely appreciate any feedback\.$/);
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
    expect(reply).toContain(`FREE to use with ChatGPT: ${seedProducts[1].url}`);
    expect(reply).not.toContain("—");
  });

  it("writes contextual non-promotional replies for ordinary X posts", async () => {
    delete process.env.OPENAI_API_KEY;
    const reply = await generateReply(
      {
        ...post,
        platform: "x",
        title: "You can now share any map view",
        body: "I added query params so the exact view can be sent as a link.",
      },
      seedProducts,
    );

    expect(reply).toContain("shareable through the URL");
    expect(reply).not.toContain("ReelBlocks");
    expect(reply).not.toContain(seedProducts[0].url);
    expect(reply).not.toContain("•");
    expect(reply.length).toBeLessThanOrEqual(280);
    expect(reply).not.toMatch(/[—–]/);
  });

  it("uses one product and stays within 280 characters when X invites products", async () => {
    delete process.env.OPENAI_API_KEY;
    const reply = await generateReply(
      { ...post, platform: "x" },
      seedProducts,
    );

    expect(reply).toContain("ReelBlocks");
    expect(reply).toContain(seedProducts[0].url);
    expect(reply).not.toContain("Fluentish");
    expect(reply).not.toContain(seedProducts[1].url);
    expect(reply).not.toContain("•");
    expect(reply.length).toBeLessThanOrEqual(280);
  });
});
