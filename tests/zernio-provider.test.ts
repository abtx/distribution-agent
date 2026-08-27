import { afterEach, describe, expect, it, vi } from "vitest";
import { ZernioRedditProvider } from "@/lib/reddit/zernioProvider";

afterEach(() => vi.unstubAllGlobals());

describe("Zernio Reddit provider", () => {
  it("searches each watched subreddit for invitation threads and preserves exact permalinks", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const subreddit = url.searchParams.get("subreddit")!;
      return new Response(JSON.stringify({ items: [{
        id: `post-${subreddit}`,
        title: `Share your product in ${subreddit}`,
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
    expect(firstUrl.pathname).toBe("/api/v1/reddit/search");
    expect(firstUrl.searchParams.get("q")).toContain("what are you building");
    expect(firstUrl.searchParams.get("restrict_sr")).toBe("1");
    expect(firstUrl.searchParams.get("sort")).toBe("new");
  });

  it("requires local Zernio configuration", async () => {
    await expect(new ZernioRedditProvider([], "", "").searchOpportunities())
      .rejects.toThrow("npm run zernio:setup");
  });

  it("keeps explicit invitation threads and excludes ordinary builder posts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ items: [
      {
        id: "generic",
        title: "I built a zero-dependency CLI",
        selftext: "Here is what I made this week.",
        author: "maker",
        subreddit: "SideProject",
        permalink: "https://www.reddit.com/r/SideProject/comments/generic/post/",
        createdUtc: 1_777_000_000,
      },
      {
        id: "invitation",
        title: "What SaaS are you building? Drop it below",
        selftext: "Share your product and tell us what it does.",
        author: "host",
        subreddit: "SideProject",
        permalink: "https://www.reddit.com/r/SideProject/comments/invitation/post/",
        createdUtc: 1_777_000_001,
      },
      {
        id: "older-invitation",
        title: "What SaaS are you building? Drop it below",
        selftext: "Share your product and tell us what it does.",
        author: "host",
        subreddit: "SideProject",
        permalink: "https://www.reddit.com/r/SideProject/comments/older/post/",
        createdUtc: 1_776_000_001,
      },
      {
        id: "tips",
        title: "Share your language learning tips",
        selftext: "What memorisation method works for you?",
        author: "learner",
        subreddit: "SideProject",
        permalink: "https://www.reddit.com/r/SideProject/comments/tips/post/",
        createdUtc: 1_777_000_002,
      },
      {
        id: "own-promotion",
        title: "[Self-Promotion] I built a developer spending app",
        selftext: "Here is my product.",
        author: "maker",
        subreddit: "SideProject",
        permalink: "https://www.reddit.com/r/SideProject/comments/own/post/",
        createdUtc: 1_777_000_003,
      },
      {
        id: "meta-question",
        title: "Does Drop your URL posts work for you?",
        selftext: "A discussion about promotion threads.",
        author: "founder",
        subreddit: "SideProject",
        permalink: "https://www.reddit.com/r/SideProject/comments/meta/post/",
        createdUtc: 1_777_000_004,
      },
    ] }))));

    const posts = await new ZernioRedditProvider(["SideProject"], "secret", "account").searchOpportunities();
    expect(posts.map((post) => post.id)).toEqual(["invitation"]);
  });

  it("reports upstream authorization errors without hiding the response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401 },
    )));
    await expect(new ZernioRedditProvider(["SaaS"], "bad", "account").searchOpportunities())
      .rejects.toThrow("Zernio Reddit search failed (401)");
  });
});
