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
  const index = opportunities.findIndex((item) => item.id === id);
  return (
    <OpportunityDetail
      initial={opportunity}
      products={products}
      previousId={index > 0 ? opportunities[index - 1].id : null}
      nextId={index < opportunities.length - 1 ? opportunities[index + 1].id : null}
      position={index + 1}
      total={opportunities.length}
    />
  );
}
