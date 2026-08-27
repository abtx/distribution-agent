import { afterEach, describe, expect, it, vi } from "vitest";
import { ZernioRedditProvider } from "@/lib/reddit/zernioProvider";

afterEach(() => vi.unstubAllGlobals());

describe("Zernio Reddit provider", () => {
  it("loads each watched subreddit newest feed and preserves exact permalinks", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const subreddit = url.searchParams.get("subreddit")!;
      return new Response(JSON.stringify({ items: [{
        id: `post-${subreddit}`,
        title: `Share in ${subreddit}`,
        selftext: "Drop your product",
        author: "builder",
        subreddit,
        url: "https://example.com/product",
        permalink: `https://www.reddit.com/r/${subreddit}/comments/abc/share/`,
        score: 12,
        numComments: 4,
        createdUtc: 1_777_000_000,
      }] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const posts = await new ZernioRedditProvider(["r/SaaS", "SideProject"], "secret", "reddit-account").searchOpportunities();

    expect(posts).toHaveLength(2);
    expect(posts[0].url).toContain("/comments/abc/share/");
    expect(posts[0].platform).toBe("reddit");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(firstUrl.searchParams.get("accountId")).toBe("reddit-account");
    expect(firstUrl.searchParams.get("subreddit")).toBe("SaaS");
    expect(firstUrl.searchParams.get("sort")).toBe("new");
    expect(firstUrl.searchParams.get("t")).toBe("week");
  });

  it("requires local Zernio configuration", async () => {
    await expect(new ZernioRedditProvider([], "", "").searchOpportunities())
      .rejects.toThrow("npm run zernio:setup");
  });

  it("reports upstream authorization errors without hiding the response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401 },
    )));
    await expect(new ZernioRedditProvider(["SaaS"], "bad", "account").searchOpportunities())
      .rejects.toThrow("Zernio Reddit feed failed (401)");
  });
});
