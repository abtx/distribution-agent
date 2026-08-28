import type { Opportunity } from "../types";

type PostIdentity = Pick<Opportunity, "reddit_post_id" | "post_url">;

export function canonicalPostKey(post: PostIdentity) {
  try {
    const url = new URL(post.post_url);
    const host = url.hostname.toLowerCase().replace(/^(?:www\.|old\.|new\.)/, "");
    const redditId =
      host === "redd.it"
        ? url.pathname.split("/").filter(Boolean)[0]
        : host === "reddit.com" || host.endsWith(".reddit.com")
          ? url.pathname.match(/\/comments\/([^/]+)/i)?.[1]
          : null;
    if (redditId) return `reddit:${redditId.toLowerCase()}`;

    const xId =
      host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com")
        ? url.pathname.match(/\/status(?:es)?\/(\d+)/i)?.[1]
        : null;
    if (xId) return `x:${xId}`;

    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `url:${host}${pathname.toLowerCase()}`;
  } catch {
    return `id:${post.reddit_post_id.toLowerCase().replace(/^x-/, "")}`;
  }
}

export function samePost(a: PostIdentity, b: PostIdentity) {
  return canonicalPostKey(a) === canonicalPostKey(b);
}

function preference(opportunity: Opportunity) {
  const source = opportunity.source === "mock" ? 0 : 1;
  const created = new Date(
    opportunity.discovered_at || opportunity.created_at,
  ).getTime();
  return [source, opportunity.score, Number.isFinite(created) ? created : 0];
}

function preferredPending(opportunities: Opportunity[]) {
  return [...opportunities].sort((a, b) => {
    const left = preference(a);
    const right = preference(b);
    return right[0] - left[0] || right[1] - left[1] || right[2] - left[2];
  })[0];
}

export function actionableOpportunities(opportunities: Opportunity[]) {
  const groups = new Map<string, Opportunity[]>();
  for (const opportunity of opportunities) {
    const key = canonicalPostKey(opportunity);
    groups.set(key, [...(groups.get(key) || []), opportunity]);
  }

  const selected = new Set<string>();
  for (const group of groups.values()) {
    if (group.some((item) => item.status === "posted" || item.status === "rejected"))
      continue;
    const pending = group.filter((item) => item.status === "pending");
    const preferred = pending.length ? preferredPending(pending) : null;
    if (preferred) selected.add(preferred.id);
  }
  return opportunities.filter((item) => selected.has(item.id));
}

export function duplicatePendingIds(opportunities: Opportunity[]) {
  const actionable = new Set(
    actionableOpportunities(opportunities).map((item) => item.id),
  );
  return opportunities
    .filter((item) => item.status === "pending" && !actionable.has(item.id))
    .map((item) => item.id);
}
