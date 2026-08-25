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
  const pending = opportunities.filter((item) => item.status === "pending");
  const index = pending.findIndex((item) => item.id === id);
  return (
    <OpportunityDetail
      initial={opportunity}
      products={products}
      previousId={index > 0 ? pending[index - 1].id : null}
      nextId={index >= 0 && index < pending.length - 1 ? pending[index + 1].id : null}
      position={index >= 0 ? index + 1 : undefined}
      total={index >= 0 ? pending.length : undefined}
    />
  );
}
