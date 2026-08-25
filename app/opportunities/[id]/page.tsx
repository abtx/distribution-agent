import { notFound } from "next/navigation";
import { OpportunityDetail } from "@/components/OpportunityDetail";
import { repository } from "@/lib/repository";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opportunities, products] = await Promise.all([
    repository.opportunities(),
    repository.products(),
  ]);
  const opportunity = opportunities.find((o) => o.id === id);
  if (!opportunity) notFound();
  return <OpportunityDetail initial={opportunity} products={products} />;
}
