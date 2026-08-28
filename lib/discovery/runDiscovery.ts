import { randomUUID } from "node:crypto";
import { classifyOpportunity } from "../ai/classifyOpportunity";
import { generateReply } from "../ai/generateReply";
import { MockRedditProvider } from "../reddit/mockProvider";
import { RedditApiProvider } from "../reddit/redditApiProvider";
import { ZernioRedditProvider } from "../reddit/zernioProvider";
import type { RedditProvider } from "../reddit/provider";
import { repository } from "../repository";
import { marketingStore } from "../marketingStore";
import { XApiProvider } from "../x/xApiProvider";
import type { DiscoveryRun, Opportunity } from "../types";
import { canonicalPostKey } from "../opportunities/identity";
let running = false;
export async function runDiscovery(provider?: RedditProvider) {
  if (running) throw new Error("A discovery run is already in progress");
  running = true;
  const run: DiscoveryRun = {
    id: randomUUID(),
    started_at: new Date().toISOString(),
    completed_at: null,
    status: "running",
    candidates_found: 0,
    opportunities_created: 0,
    error: null,
    metadata: { errors: [], provider_errors: [] },
  };
  await repository.addRun(run);
  try {
    const configuredSources = await marketingStore.discoverySources();
    const redditTargets = configuredSources.filter((item) => item.enabled && item.channel === "reddit").map((item) => item.name);
    const xTargets = configuredSources.filter((item) => item.enabled && item.channel === "x").map((item) => item.name);
    const zernioReddit = Boolean(process.env.ZERNIO_API_KEY && process.env.ZERNIO_REDDIT_ACCOUNT_ID);
    const liveReddit = Boolean(provider) || zernioReddit || process.env.USE_MOCK_REDDIT === "false";
    const source = provider || (zernioReddit
      ? new ZernioRedditProvider(redditTargets)
      : liveReddit ? new RedditApiProvider(redditTargets) : new MockRedditProvider(redditTargets));
    const results = await Promise.allSettled([
      source.searchOpportunities(),
      ...(xTargets.length ? [new XApiProvider(xTargets).searchOpportunities()] : []),
    ]);
    const posts = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    (run.metadata.provider_errors as string[]).push(...results.flatMap((result) => result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : String(result.reason)] : []));
    run.metadata.sources = { reddit: redditTargets, x: xTargets };
    run.metadata.provider_modes = {
      reddit: zernioReddit ? "zernio" : liveReddit ? "live" : "demo",
      x: xTargets.length ? "live" : "disabled",
    };
    run.candidates_found = posts.length;
    const active = (await repository.products()).filter(
      (p) => p.status === "active",
    );
    const known = new Set(
      (await repository.opportunities()).map(canonicalPostKey),
    );
    const fresh = posts.filter(
      (p) =>
        !known.has(
          canonicalPostKey({ reddit_post_id: p.id, post_url: p.url }),
        ) &&
        Date.now() - new Date(p.createdUtc).getTime() < 8 * 86400000,
    );
    for (let i = 0; i < fresh.length; i += 3) {
      await Promise.all(
        fresh.slice(i, i + 3).map(async (post) => {
          try {
            const c = await classifyOpportunity(post, active);
            if (
              !c.isPromotionOpportunity ||
              !c.promotionExplicitlyAllowed ||
              c.opportunityScore < 65 ||
              c.productMatchScore < 65 ||
              !c.bestProductId
            )
              return;
            const matches = (
              c.productMatches.length
                ? c.productMatches
                : [{ productId: c.bestProductId, score: c.productMatchScore }]
            ).filter((match) => match.productId && match.score >= 65);
            const products = matches
              .map((match) => active.find((p) => p.id === match.productId))
              .filter((product): product is (typeof active)[number] =>
                Boolean(product),
              );
            if (!products.length) return;
            const product = products[0];
            const now = new Date().toISOString();
            const reply = await generateReply(post, products);
            const o: Opportunity = {
              id: randomUUID(),
              reddit_post_id: post.id,
              subreddit: post.subreddit,
              post_title: post.title,
              post_body: post.body,
              post_url: post.url,
              author: post.author,
              created_utc: post.createdUtc,
              discovered_at: now,
              score: c.opportunityScore,
              reasoning: c.reasoning,
              promotion_allowed: c.promotionExplicitlyAllowed,
              matched_product_id: product.id,
              matched_product_ids: products.map((p) => p.id),
              product_matches: matches,
              match_score: c.productMatchScore,
              proposed_reply: reply,
              edited_reply: null,
              status: "pending",
              source: post.platform === "x"
                ? "x_api"
                : source instanceof MockRedditProvider
                  ? "mock"
                  : source instanceof ZernioRedditProvider ? "zernio_reddit" : "reddit_api",
              metadata: { confidence: c.confidence },
              created_at: now,
              updated_at: now,
            };
            if (await repository.addOpportunity(o)) run.opportunities_created++;
          } catch (e) {
            (run.metadata.errors as string[]).push(
              e instanceof Error ? e.message : String(e),
            );
          }
        }),
      );
    }
    run.status = "completed";
    run.completed_at = new Date().toISOString();
    await repository.updateRun(run);
    return run;
  } catch (e) {
    run.status = "failed";
    run.error = e instanceof Error ? e.message : String(e);
    run.completed_at = new Date().toISOString();
    await repository.updateRun(run);
    throw e;
  } finally {
    running = false;
  }
}
