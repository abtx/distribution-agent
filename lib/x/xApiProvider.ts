import { connectionStore } from "@/lib/connections";
import { requireConnection } from "@/lib/publishing";
import type { RedditPost } from "@/lib/types";

type XUser = { id: string; username: string };
type XPost = { id: string; text: string; created_at?: string; public_metrics?: { like_count?: number; reply_count?: number } };

export class XApiProvider {
  constructor(private readonly accounts: string[]) {}

  async searchOpportunities(): Promise<RedditPost[]> {
    if (!this.accounts.length) return [];
    const stored = await connectionStore.get("x");
    const connection = stored ? await requireConnection("x") : null;
    const bearer = connection?.access_token || process.env.X_BEARER_TOKEN;
    if (!bearer) throw new Error("X watchlist skipped - connect X or set X_BEARER_TOKEN");
    const headers = { Authorization: `Bearer ${bearer}` };
    const posts: RedditPost[] = [];
    for (const account of this.accounts) {
      const username = account.replace(/^@/, "");
      const lookup = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`, { headers, signal: AbortSignal.timeout(10000) });
      if (!lookup.ok) throw new Error(`X account lookup failed for @${username} (${lookup.status})`);
      const user = ((await lookup.json()) as { data?: XUser }).data;
      if (!user) continue;
      const timeline = await fetch(`https://api.x.com/2/users/${user.id}/tweets?max_results=10&exclude=retweets,replies&tweet.fields=created_at,public_metrics`, { headers, signal: AbortSignal.timeout(10000) });
      if (!timeline.ok) throw new Error(`X timeline failed for @${username} (${timeline.status})`);
      const data = ((await timeline.json()) as { data?: XPost[] }).data || [];
      posts.push(...data.map((post) => ({
        id: `x-${post.id}`,
        subreddit: `@${user.username}`,
        title: post.text.slice(0, 100),
        body: post.text,
        url: `https://x.com/${user.username}/status/${post.id}`,
        author: user.username,
        createdUtc: post.created_at || new Date().toISOString(),
        score: post.public_metrics?.like_count || 0,
        comments: post.public_metrics?.reply_count || 0,
        platform: "x" as const,
      })));
    }
    return posts;
  }
}
