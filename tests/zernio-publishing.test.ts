import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishZernioReply } from "@/lib/publishing";

beforeEach(() => {
  process.env.ZERNIO_API_KEY = "secret";
  process.env.ZERNIO_REDDIT_ACCOUNT_ID = "reddit-account";
});

afterEach(() => {
  delete process.env.ZERNIO_API_KEY;
  delete process.env.ZERNIO_REDDIT_ACCOUNT_ID;
  vi.restoreAllMocks();
});

describe("Zernio reply publishing", () => {
  it("posts the reply using the connected Reddit account", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      data: { commentId: "t1_reply" },
    }))) as typeof fetch;

    const result = await publishZernioReply({
      postId: "abc123",
      text: "A public reply",
      platform: "reddit",
      subreddit: "SideProject",
    });

    expect(result).toEqual({ id: "t1_reply", platform: "reddit", provider: "zernio" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://zernio.com/api/v1/inbox/comments/abc123",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          accountId: "reddit-account",
          message: "A public reply",
          subreddit: "SideProject",
        }),
      }),
    );
  });

  it("turns a payment response into a useful message", async () => {
    global.fetch = vi.fn(async () => new Response("{}", { status: 402 })) as typeof fetch;

    await expect(publishZernioReply({
      postId: "abc123",
      text: "A public reply",
      platform: "reddit",
    })).rejects.toThrow("plan does not include direct replies");
  });
});
