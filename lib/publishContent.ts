import { marketingStore } from "./marketingStore";
import { publishRedditPost, publishXPost } from "./publishing";
import type { ContentItem } from "./types";

async function acquireLock(id: string) {
  if (process.env.NODE_ENV === "test") return async () => {};
  const directory = path.join(process.cwd(), ".data", "publishing-locks");
  const filename = path.join(directory, `${id}.lock`);
  await mkdir(directory, { recursive: true });
  try {
    const handle = await open(filename, "wx", 0o600);
    await handle.close();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const age = Date.now() - (await stat(filename)).mtimeMs;
    if (age < 10 * 60_000)
      throw new Error("This content item is already being published");
    await unlink(filename);
    const handle = await open(filename, "wx", 0o600);
    await handle.close();
  }
  return async () => {
    await unlink(filename).catch(() => undefined);
  };
}

export async function publishContent(item: ContentItem) {
  const release = await acquireLock(item.id);
  try {
    return await publishContentUnlocked(item);
  } finally {
    await release();
  }
}

async function publishContentUnlocked(item: ContentItem) {
  if (item.kind !== "post")
    throw new Error("Connected video publishing is not available yet");
  const unsupported = item.channels.filter(
    (channel) => channel !== "x" && channel !== "reddit",
  );
  if (unsupported.length)
    throw new Error(
      `Publishing is not connected for ${unsupported.join(", ")}`,
    );
  const publications = { ...(item.publications || {}) };
  const results = [];
  try {
    for (const channel of item.channels) {
      if (publications[channel]) {
        results.push({ channel, ...publications[channel], skipped: true });
        continue;
      }
      let published;
      if (channel === "x") published = await publishXPost(item.body);
      if (channel === "reddit") {
        const target = item.targets.find((value) => /^r\//i.test(value));
        if (!target)
          throw new Error("Add a Reddit target such as r/SideProject");
        published = await publishRedditPost(target, item.title, item.body);
      }
      if (!published) continue;
      publications[channel] = {
        ...published,
        published_at: new Date().toISOString(),
      };
      results.push({ channel, ...publications[channel], skipped: false });
      await marketingStore.updateContent(item.id, { publications });
    }
    const complete = item.channels.every((channel) =>
      Boolean(publications[channel]),
    );
    const updated = await marketingStore.updateContent(item.id, {
      publications,
      status: complete ? "published" : "failed",
    });
    return { item: updated, results };
  } catch (error) {
    await marketingStore.updateContent(item.id, {
      publications,
      status: "failed",
    });
    throw error;
  }
}

export async function publishDueContent(now = new Date()) {
  const due = (await marketingStore.allContent()).filter(
    (item) =>
      item.status === "scheduled" &&
      item.scheduled_at &&
      +new Date(item.scheduled_at) <= +now,
  );
  const results = [];
  for (const item of due) {
    try {
      results.push({
        id: item.id,
        ok: true,
        result: await publishContent(item),
      });
    } catch (error) {
      results.push({
        id: item.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
import { mkdir, open, stat, unlink } from "node:fs/promises";
import path from "node:path";
