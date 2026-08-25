import { beforeEach, describe, expect, it } from "vitest";
import { regenerateOpportunities } from "@/lib/opportunities/regenerate";
import { store } from "@/lib/store";

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  store.reset();
});

describe("opportunity regeneration", () => {
  it("rebuilds analysis and replies from the latest product description", async () => {
    store.updateProduct("reelblocks", {
      description: "A newly updated visual editing workspace for creators.",
    });
    store.updateOpportunity("demo-opportunity", {
      edited_reply: "Old manual edit",
      status: "approved",
    });

    const result = await regenerateOpportunities();
    const opportunity = store
      .opportunities()
      .find((item) => item.id === "demo-opportunity");

    expect(result.regenerated).toBe(1);
    expect(opportunity?.proposed_reply).toContain(
      "newly updated visual editing workspace",
    );
    expect(opportunity?.edited_reply).toBeNull();
    expect(opportunity?.status).toBe("pending");
  });

  it("does not rewrite already published opportunities", async () => {
    const before = store.opportunities()[0].proposed_reply;
    store.updateOpportunity("demo-opportunity", { status: "posted" });
    const result = await regenerateOpportunities();

    expect(result.skipped).toBe(1);
    expect(store.opportunities()[0].proposed_reply).toBe(before);
  });
});
