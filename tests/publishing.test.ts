import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentItem } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  publishXPost: vi.fn(),
  publishRedditPost: vi.fn(),
  updateContent: vi.fn(),
}));

vi.mock("@/lib/publishing", () => ({
  publishXPost: mocks.publishXPost,
  publishRedditPost: mocks.publishRedditPost,
}));
vi.mock("@/lib/marketingStore", () => ({
  marketingStore: {
    updateContent: mocks.updateContent,
    allContent: vi.fn().mockResolvedValue([]),
  },
}));

import { publishContent } from "@/lib/publishContent";

const item: ContentItem = {
  id: "content-1",
  kind: "post",
  title: "Launch update",
  body: "We shipped something useful.",
  product_id: null,
  channels: ["x", "reddit"],
  targets: ["r/SideProject"],
  asset_name: null,
  asset_url: null,
  status: "draft",
  scheduled_at: null,
  publications: {},
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("multi-channel publishing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateContent.mockImplementation(
      async (_id: string, patch: Partial<ContentItem>) => ({
        ...item,
        ...patch,
      }),
    );
    mocks.publishXPost.mockResolvedValue({
      id: "x-1",
      url: "https://x.com/i/web/status/x-1",
    });
    mocks.publishRedditPost.mockResolvedValue({
      id: "r-1",
      url: "https://reddit.com/r/SideProject/r-1",
    });
  });

  it("persists each successful channel immediately", async () => {
    await publishContent(item);
    expect(mocks.updateContent).toHaveBeenCalledWith(
      item.id,
      expect.objectContaining({
        publications: expect.objectContaining({
          x: expect.objectContaining({ id: "x-1" }),
        }),
      }),
    );
    expect(mocks.updateContent).toHaveBeenLastCalledWith(
      item.id,
      expect.objectContaining({ status: "published" }),
    );
  });

  it("does not duplicate an already published channel when retrying", async () => {
    await publishContent({
      ...item,
      status: "failed",
      publications: {
        x: {
          id: "x-1",
          url: "https://x.com/i/web/status/x-1",
          published_at: "2026-01-01T01:00:00.000Z",
        },
      },
    });
    expect(mocks.publishXPost).not.toHaveBeenCalled();
    expect(mocks.publishRedditPost).toHaveBeenCalledOnce();
  });
});
