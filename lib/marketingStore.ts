import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContentItem, StrategyDocument } from "./types";
type MarketingState = {
  content: ContentItem[];
  strategies: StrategyDocument[];
};
const dataDir = path.join(process.cwd(), ".data"),
  dataFile = path.join(dataDir, "marketing.json");
const empty: MarketingState = { content: [], strategies: [] };
let writeQueue = Promise.resolve();
async function read(): Promise<MarketingState> {
  try {
    const state = JSON.parse(
      await readFile(dataFile, "utf8"),
    ) as MarketingState;
    state.content = state.content.map((item) => ({
      ...item,
      publications: item.publications || {},
    }));
    return state;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return structuredClone(empty);
  }
}
async function write(state: MarketingState) {
  await mkdir(dataDir, { recursive: true });
  const temp = `${dataFile}.tmp`;
  writeQueue = writeQueue.then(async () => {
    await writeFile(temp, JSON.stringify(state, null, 2));
    await rename(temp, dataFile);
  });
  await writeQueue;
}
export const marketingStore = {
  async allContent() {
    return (await read()).content.sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
  },
  async addContent(item: ContentItem) {
    const state = await read();
    state.content.unshift(item);
    await write(state);
    return item;
  },
  async updateContent(id: string, patch: Partial<ContentItem>) {
    const state = await read(),
      i = state.content.findIndex((x) => x.id === id);
    if (i < 0) return null;
    state.content[i] = {
      ...state.content[i],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    await write(state);
    return state.content[i];
  },
  async strategies() {
    return (await read()).strategies.sort(
      (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
    );
  },
  async saveStrategy(doc: StrategyDocument) {
    const state = await read(),
      i = state.strategies.findIndex((x) => x.id === doc.id);
    if (i < 0) state.strategies.unshift(doc);
    else state.strategies[i] = doc;
    await write(state);
    return doc;
  },
};
