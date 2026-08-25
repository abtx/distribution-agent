import { describe, expect, it } from "vitest";
import { classificationSchema } from "@/lib/ai/schemas";
describe("AI schemas", () => {
  it("validates structured classifications", () => {
    expect(
      classificationSchema.parse({
        isPromotionOpportunity: true,
        promotionExplicitlyAllowed: true,
        confidence: 0.9,
        opportunityScore: 80,
        reasoning: "Explicit invitation",
        bestProductId: "x",
        productMatchScore: 70,
      }).opportunityScore,
    ).toBe(80);
  });
  it("rejects malformed model output", () => {
    expect(
      classificationSchema.safeParse({ opportunityScore: "high" }).success,
    ).toBe(false);
  });
});
