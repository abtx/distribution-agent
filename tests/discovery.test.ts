import { beforeEach, describe, expect, it } from "vitest";
import { store } from "@/lib/store";
import { runDiscovery } from "@/lib/discovery/runDiscovery";
import type { RedditProvider } from "@/lib/reddit/provider";
import { heuristicClassification } from "@/lib/ai/classifyOpportunity";
const valid = {
  id: "unique",
  subreddit: "SideProject",
  title: "Share what you are building",
  body: "Drop your product and link",
  url: "https://reddit.com/x",
  author: "a",
  createdUtc: new Date().toISOString(),
  comments: 10,
};
beforeEach(() => {
  store.reset();
  delete process.env.OPENAI_API_KEY;
  delete process.env.ZERNIO_API_KEY;
  delete process.env.ZERNIO_REDDIT_ACCOUNT_ID;
});
describe("discovery", () => {
  it("creates valid opportunities and discards irrelevant ones", async () => {
    const provider: RedditProvider = {
      searchOpportunities: async () => [
        valid,
        {
          ...valid,
          id: "bad",
          title: "Need accounting advice",
          body: "No promotions please",
        },
      ],
    };
    const run = await runDiscovery(provider);
    expect(run.opportunities_created).toBe(1);
    expect(store.opportunities().some((o) => o.reddit_post_id === "bad")).toBe(
      false,
    );
  });
  it("prevents duplicate Reddit posts across reruns", async () => {
    const p: RedditProvider = { searchOpportunities: async () => [valid] };
    await runDiscovery(p);
    await runDiscovery(p);
    expect(
      store.opportunities().filter((o) => o.reddit_post_id === "unique"),
    ).toHaveLength(1);
  });
  it("enforces score threshold", async () => {
    const p: RedditProvider = {
      searchOpportunities: async () => [
        { ...valid, title: "Maybe a discussion", body: "founder thoughts" },
      ],
    };
    const run = await runDiscovery(p);
    expect(run.opportunities_created).toBe(0);
  });
  it("ignores inactive products and selects best active product", () => {
    store.updateProduct("reelblocks", { status: "disabled" });
    const c = heuristicClassification(
      {
        ...valid,
        title: "Share your language learning app",
        body: "Drop your language product",
      },
      store.products(),
    );
    expect(c.bestProductId).toBe("fluentish");
  });
});
