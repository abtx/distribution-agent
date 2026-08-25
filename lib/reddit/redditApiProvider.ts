import type { RedditProvider } from "./provider";
import type { RedditPost } from "../types";
type RedditChild = {
  data: {
    id: string;
    subreddit: string;
    title: string;
    selftext?: string;
    permalink: string;
    author: string;
    created_utc: number;
    score: number;
    num_comments: number;
  };
};
const queries = [
  "share your startup",
  "share your SaaS",
  "drop your startup",
  "drop your product",
  "what are you building",
  "what did you build",
  "show what you built",
  "showcase your startup",
  "self promotion",
  "weekly promotion",
  "side project thread",
  "indie hacker showcase",
  "launch your startup",
  "founder showcase",
  "share your side project",
];
export class RedditApiProvider implements RedditProvider {
  async searchOpportunities(): Promise<RedditPost[]> {
    const id = process.env.REDDIT_CLIENT_ID,
      secret = process.env.REDDIT_CLIENT_SECRET,
      agent = process.env.REDDIT_USER_AGENT;
    if (!id || !secret || !agent)
      throw new Error("Reddit credentials are not configured");
    const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "User-Agent": agent,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenRes.ok)
      throw new Error(`Reddit authentication failed (${tokenRes.status})`);
    const token = ((await tokenRes.json()) as { access_token: string })
      .access_token;
    const search = async (q: string) => {
      const r = await fetch(
        `https://oauth.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&t=week&limit=25`,
        {
          headers: { Authorization: `Bearer ${token}`, "User-Agent": agent },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!r.ok) throw new Error(`Reddit search failed (${r.status})`);
      const j = (await r.json()) as { data: { children: RedditChild[] } };
      return j.data.children.map(({ data }) => ({
        id: data.id,
        subreddit: data.subreddit,
        title: data.title,
        body: data.selftext || "",
        url: `https://reddit.com${data.permalink}`,
        author: data.author,
        createdUtc: new Date(data.created_utc * 1000).toISOString(),
        score: data.score,
        comments: data.num_comments,
      }));
    };
    const results: RedditPost[][] = [];
    for (let i = 0; i < queries.length; i += 3)
      results.push(...(await Promise.all(queries.slice(i, i + 3).map(search))));
    return [...new Map(results.flat().map((p) => [p.id, p])).values()];
  }
}
