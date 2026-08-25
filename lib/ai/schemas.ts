import { z } from "zod";
export const classificationSchema = z.object({
  isPromotionOpportunity: z.boolean(),
  promotionExplicitlyAllowed: z.boolean(),
  confidence: z.number().min(0).max(1),
  opportunityScore: z.number().min(0).max(100),
  reasoning: z.string().min(3),
  bestProductId: z.string().nullable(),
  productMatchScore: z.number().min(0).max(100),
  productMatches: z
    .array(
      z.object({
        productId: z.string(),
        score: z.number().min(0).max(100),
      }),
    )
    .default([]),
});
export const replySchema = z.object({ reply: z.string().min(20).max(1200) });
