import { useEffect, useState } from "react";
import { ConnectionsPage } from "@/components/ConnectionsPage";
import { ContentPage } from "@/components/ContentPage";
import { Dashboard } from "@/components/Dashboard";
import { OpportunityDetail } from "@/components/OpportunityDetail";
import { ProductsPage } from "@/components/ProductsPage";
import { StrategyPage } from "@/components/StrategyPage";
import { VideosPage } from "@/components/VideosPage";
import type { Opportunity, Product } from "@/lib/types";

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  const opportunityId = path.match(/^\/opportunities\/([^/]+)$/)?.[1];
  if (opportunityId) return <OpportunityRoute id={decodeURIComponent(opportunityId)} />;
  if (path === "/connections") return <ConnectionsPage />;
  if (path === "/content") return <ContentPage />;
  if (path === "/products") return <ProductsPage />;
  if (path === "/strategy") return <StrategyPage />;
  if (path === "/videos") return <VideosPage />;
  return <Dashboard />;
}

function OpportunityRoute({ id }: { id: string }) {
  const [data, setData] = useState<{
    opportunities: Opportunity[];
    products: Product[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load opportunity");
        setData(await response.json());
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not load opportunity"),
      );
  }, [id]);
  if (error) return <main className="state error">{error}</main>;
  if (!data) return <main className="state">Loading opportunity...</main>;
  const opportunity = data.opportunities.find((item) => item.id === id);
  if (!opportunity) return <main className="state error">Opportunity not found</main>;
  const pending = data.opportunities.filter((item) => item.status === "pending");
  const index = pending.findIndex((item) => item.id === id);
  return (
    <OpportunityDetail
      key={id}
      initial={opportunity}
      products={data.products}
      previousId={index > 0 ? pending[index - 1].id : null}
      nextId={index >= 0 && index < pending.length - 1 ? pending[index + 1].id : null}
      position={index >= 0 ? index + 1 : undefined}
      total={index >= 0 ? pending.length : undefined}
    />
  );
}
