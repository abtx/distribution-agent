import { beforeEach, describe, expect, it } from "vitest";
import { actionableOpportunities } from "@/lib/opportunities/identity";
import { seedOpportunities } from "@/lib/seed";
import { store } from "@/lib/store";

beforeEach(() => store.reset());

describe("opportunity identity", () => {
  it("rejects the same post URL when a provider supplies a different ID", () => {
    const duplicate = {
      ...structuredClone(seedOpportunities[0]),
      id: "provider-duplicate",
      reddit_post_id: "provider-specific-id",
      source: "zernio_reddit",
    };

    expect(store.addOpportunity(duplicate)).toBe(false);
    expect(store.opportunities()).toHaveLength(1);
  });

  it("excludes pending duplicates of replied and rejected posts", () => {
    const replied = {
      ...structuredClone(seedOpportunities[0]),
      id: "replied",
      status: "posted" as const,
    };
    const rejected = {
      ...structuredClone(seedOpportunities[0]),
      id: "rejected",
      reddit_post_id: "rejected-original",
      post_url: "https://reddit.com/r/SaaS/comments/rejected-original/example/",
      status: "rejected" as const,
    };
    const pendingAfterReply = {
      ...structuredClone(replied),
      id: "pending-after-reply",
      reddit_post_id: "alternate-provider-id",
      status: "pending" as const,
    };
    const pendingAfterReject = {
      ...structuredClone(rejected),
      id: "pending-after-reject",
      reddit_post_id: "another-provider-id",
      post_url: "https://www.reddit.com/r/saas/comments/rejected-original/example?utm_source=test",
      status: "pending" as const,
    };

    expect(
      actionableOpportunities([
        pendingAfterReply,
        pendingAfterReject,
        rejected,
        replied,
      ]),
    ).toEqual([]);
  });

  it("returns only one pending record for each canonical post", () => {
    const mock = structuredClone(seedOpportunities[0]);
    const live = {
      ...structuredClone(mock),
      id: "live-record",
      reddit_post_id: "live-provider-id",
      source: "zernio_reddit",
    };

    expect(actionableOpportunities([mock, live])).toEqual([live]);
  });
});
