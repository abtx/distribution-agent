import { duplicatePendingIds } from "./identity";
import { repository } from "../repository";

export async function expireDuplicatePendingOpportunities() {
  const opportunities = await repository.opportunities();
  const duplicateIds = duplicatePendingIds(opportunities);
  for (const id of duplicateIds) {
    const opportunity = opportunities.find((item) => item.id === id);
    if (!opportunity) continue;
    await repository.updateOpportunity(id, {
      status: "expired",
      metadata: {
        ...opportunity.metadata,
        expired_reason: "Duplicate of an existing replied, rejected, or pending post",
      },
    });
  }
  return { expired: duplicateIds.length, ids: duplicateIds };
}
