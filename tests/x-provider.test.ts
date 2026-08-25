import { afterEach, describe, expect, it, vi } from "vitest";
import { XApiProvider } from "@/lib/x/xApiProvider";
import { connectionStore } from "@/lib/connections";

describe("X discovery provider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads recent original posts from watched accounts", async () => {
    vi.spyOn(connectionStore, "get").mockResolvedValue(null);
    process.env.X_BEARER_TOKEN = "test-token";
    global.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes("by/username/levelsio"))
        return new Response(JSON.stringify({ data: { id: "42", username: "levelsio" } }));
      return new Response(JSON.stringify({ data: [{ id: "123", text: "How I market a product launch", created_at: "2026-08-25T08:00:00Z", public_metrics: { like_count: 50, reply_count: 4 } }] }));
    }) as typeof fetch;
    const posts = await new XApiProvider(["@levelsio"]).searchOpportunities();
    expect(posts[0]).toMatchObject({ id: "x-123", subreddit: "@levelsio", platform: "x", comments: 4 });
    expect(posts[0].url).toBe("https://x.com/levelsio/status/123");
    delete process.env.X_BEARER_TOKEN;
  });
});
