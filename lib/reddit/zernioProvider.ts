import type { RedditPost } from "../types";
import type { RedditProvider } from "./provider";

type ZernioRedditItem = {
  id: string;
  title: string;
  selftext?: string;
  author: string;
  subreddit: string;
  url?: string;
  permalink?: string;
  score?: number;
  numComments?: number;
  createdUtc: number | string;
};

type ZernioFeedResponse = {
  items?: ZernioRedditItem[];
};

function asIsoDate(value: number | string) {
  const date = typeof value === "number"
    ? new Date(value > 10_000_000_000 ? value : value * 1000)
    : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Zernio returned an invalid Reddit post date");
  return date.toISOString();
}

function postUrl(item: ZernioRedditItem) {
  if (item.permalink?.startsWith("http")) return item.permalink;
  if (item.permalink) return `https://www.reddit.com${item.permalink}`;
  if (item.url?.includes("reddit.com/r/") && item.url.includes("/comments/")) return item.url;
  return `https://www.reddit.com/r/${encodeURIComponent(item.subreddit)}/comments/${encodeURIComponent(item.id)}/`;
}

export class ZernioRedditProvider implements RedditProvider {
  constructor(
    private readonly subreddits: string[] = [],
    private readonly apiKey = process.env.ZERNIO_API_KEY,
    private readonly accountId = process.env.ZERNIO_REDDIT_ACCOUNT_ID,
  ) {}

  async searchOpportunities(): Promise<RedditPost[]> {
    if (!this.apiKey || !this.accountId)
      throw new Error("Zernio Reddit is not configured - run npm run zernio:setup");

    const targets = this.subreddits.length ? this.subreddits : [undefined];
    const results: RedditPost[][] = [];
    for (let index = 0; index < targets.length; index += 3) {
      results.push(...await Promise.all(targets.slice(index, index + 3).map((subreddit) => this.fetchFeed(subreddit))));
    }
    return [...new Map(results.flat().map((post) => [post.id, post])).values()];
  }

  private async fetchFeed(subreddit?: string): Promise<RedditPost[]> {
    const params = new URLSearchParams({
      accountId: this.accountId!,
      sort: "new",
      limit: "50",
      t: "week",
    });
    if (subreddit) params.set("subreddit", subreddit.replace(/^r\//i, ""));
    const response = await fetch(`https://zernio.com/api/v1/reddit/feed?${params}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Zernio Reddit feed failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`);
    }
    const payload = await response.json() as ZernioFeedResponse;
    if (!Array.isArray(payload.items)) throw new Error("Zernio returned an invalid Reddit feed response");
    return payload.items.map((item) => ({
      id: item.id,
      subreddit: item.subreddit,
      title: item.title,
      body: item.selftext || "",
      url: postUrl(item),
      author: item.author,
      createdUtc: asIsoDate(item.createdUtc),
      score: item.score,
      comments: item.numComments,
      platform: "reddit",
    }));
  }
}
