import { createClient } from "@supabase/supabase-js";
import { store } from "./store";
import type { DiscoveryRun, Opportunity, Product } from "./types";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}
function unwrap<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}) {
  if (error) throw new Error(error.message);
  return data as T;
}
export const repository = {
  async products() {
    const c = db();
    if (!c) return store.products();
    return unwrap<Product[]>(
      await c
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }),
    );
  },
  async opportunities() {
    const c = db();
    if (!c) return store.opportunities();
    return unwrap<Opportunity[]>(
      await c
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false }),
    );
  },
  async runs() {
    const c = db();
    if (!c) return store.runs();
    return unwrap<DiscoveryRun[]>(
      await c
        .from("discovery_runs")
        .select("*")
        .order("started_at", { ascending: false }),
    );
  },
  async addProduct(p: Product) {
    const c = db();
    if (!c) {
      store.addProduct(p);
      return p;
    }
    return unwrap<Product>(
      (await c.from("products").insert(p).select().single()) as never,
    );
  },
  async updateProduct(id: string, patch: Partial<Product>) {
    const c = db();
    if (!c) return store.updateProduct(id, patch);
    return unwrap<Product>(
      (await c
        .from("products")
        .update(patch)
        .eq("id", id)
        .select()
        .single()) as never,
    );
  },
  async addOpportunity(o: Opportunity) {
    const c = db();
    if (!c) return store.addOpportunity(o);
    const { error } = await c.from("opportunities").insert(o);
    if (error?.code === "23505") return false;
    if (error) throw new Error(error.message);
    return true;
  },
  async updateOpportunity(id: string, patch: Partial<Opportunity>) {
    const c = db();
    if (!c) return store.updateOpportunity(id, patch);
    return unwrap<Opportunity>(
      (await c
        .from("opportunities")
        .update(patch)
        .eq("id", id)
        .select()
        .single()) as never,
    );
  },
  async addRun(r: DiscoveryRun) {
    const c = db();
    if (!c) {
      store.addRun(r);
      return;
    }
    const { error } = await c.from("discovery_runs").insert(r);
    if (error) throw new Error(error.message);
  },
  async updateRun(r: DiscoveryRun) {
    const c = db();
    if (!c) {
      store.updateRun(r);
      return;
    }
    const { error } = await c.from("discovery_runs").update(r).eq("id", r.id);
    if (error) throw new Error(error.message);
  },
};
