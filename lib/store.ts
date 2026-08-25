import type { DiscoveryRun, Opportunity, Product } from "./types";
import { seedOpportunities, seedProducts } from "./seed";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
type State = {
  products: Product[];
  opportunities: Opportunity[];
  runs: DiscoveryRun[];
};
const localFile = path.join(process.cwd(), ".data", "core.json");
function fresh(): State {
  return {
    products: structuredClone(seedProducts),
    opportunities: structuredClone(seedOpportunities),
    runs: [],
  };
}
function loadLocal(): State {
  if (process.env.NODE_ENV === "test" || !existsSync(localFile)) return fresh();
  try {
    const loaded = JSON.parse(readFileSync(localFile, "utf8")) as State;
    loaded.opportunities = loaded.opportunities.map((opportunity) => ({
      ...opportunity,
      matched_product_ids: opportunity.matched_product_ids?.length
        ? opportunity.matched_product_ids
        : [opportunity.matched_product_id],
      product_matches: opportunity.product_matches?.length
        ? opportunity.product_matches
        : [
            {
              productId: opportunity.matched_product_id,
              score: opportunity.match_score,
            },
          ],
    }));
    return loaded;
  } catch {
    return fresh();
  }
}
function persist(value: State) {
  if (process.env.NODE_ENV === "test") return;
  mkdirSync(path.dirname(localFile), { recursive: true });
  const temp = `${localFile}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2));
  renameSync(temp, localFile);
}
const globalStore = globalThis as unknown as { distributionState?: State };
export const state = (globalStore.distributionState ??= loadLocal());
globalStore.distributionState = state;
export const store = {
  products: () => state.products,
  opportunities: () => state.opportunities,
  runs: () => state.runs,
  addProduct: (p: Product) => {
    state.products.unshift(p);
    persist(state);
  },
  updateProduct: (id: string, patch: Partial<Product>) => {
    const i = state.products.findIndex((p) => p.id === id);
    if (i < 0) return null;
    state.products[i] = {
      ...state.products[i],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    persist(state);
    return state.products[i];
  },
  addOpportunity: (o: Opportunity) => {
    if (state.opportunities.some((x) => x.reddit_post_id === o.reddit_post_id))
      return false;
    state.opportunities.unshift(o);
    persist(state);
    return true;
  },
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => {
    const i = state.opportunities.findIndex((o) => o.id === id);
    if (i < 0) return null;
    state.opportunities[i] = {
      ...state.opportunities[i],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    persist(state);
    return state.opportunities[i];
  },
  addRun: (r: DiscoveryRun) => {
    state.runs.unshift(r);
    persist(state);
  },
  updateRun: (r: DiscoveryRun) => {
    const i = state.runs.findIndex((x) => x.id === r.id);
    if (i >= 0) state.runs[i] = r;
    persist(state);
  },
  reset: () => {
    const value = fresh();
    state.products = value.products;
    state.opportunities = value.opportunities;
    state.runs = [];
  },
};
