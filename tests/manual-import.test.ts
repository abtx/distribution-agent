import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/opportunities/import/route";
import { store } from "@/lib/store";

describe("manual Reddit opportunity import", () => {
  beforeEach(() => { store.reset(); delete process.env.OPENAI_API_KEY; });

  it("classifies, drafts, queues, and deduplicates a pasted post", async () => {
    const makeRequest = () => new Request("http://local/api/opportunities/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://www.reddit.com/r/saasinvestors/comments/abc123/what_saas_are_you_building/",
        title: "What SaaS are you building? Drop it",
        body: "Always interested in seeing indie SaaS projects. Drop yours and what it does.",
        author: "founder",
      }),
    });
    const response = await POST(makeRequest());
    expect(response.status).toBe(201);
    const opportunity = await response.json();
    expect(opportunity).toMatchObject({ reddit_post_id: "abc123", subreddit: "saasinvestors", status: "pending", source: "manual_browser_review" });
    expect(opportunity.proposed_reply).toContain("Fluentish");
    const duplicate = await POST(makeRequest());
    expect(duplicate.status).toBe(409);
  });

  it("rejects community pages instead of treating them as posts", async () => {
    const response = await POST(new Request("http://local/api/opportunities/import", {
      method: "POST", body: JSON.stringify({ url: "https://www.reddit.com/r/saasinvestors/new/", title: "Community", body: "" }),
    }));
    expect(response.status).toBe(400);
  });
});
