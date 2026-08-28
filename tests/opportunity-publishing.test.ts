import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/opportunities/[id]/publish/route";
import { store } from "@/lib/store";

const publishing = vi.hoisted(() => ({ reply: vi.fn() }));
vi.mock("@/lib/publishing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/publishing")>()),
  publishZernioReply: publishing.reply,
}));

function request(text = "A reviewed public reply") {
  return new Request("http://localhost/api/opportunities/demo-opportunity/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

const context = { params: Promise.resolve({ id: "demo-opportunity" }) };

beforeEach(() => {
  store.reset();
  publishing.reply.mockReset();
});

describe("opportunity reply publishing", () => {
  it("publishes through Zernio and records the reply", async () => {
    publishing.reply.mockResolvedValue({ id: "t1_reply", platform: "reddit", provider: "zernio" });

    const response = await POST(request(), context);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(publishing.reply).toHaveBeenCalledWith(expect.objectContaining({
      postId: store.opportunities()[0].reddit_post_id,
      text: "A reviewed public reply",
      platform: "reddit",
    }));
    expect(result.status).toBe("posted");
    expect(result.edited_reply).toBe("A reviewed public reply");
    expect(result.metadata.published).toMatchObject({ id: "t1_reply", provider: "zernio" });
    expect(result.metadata.published.url).toContain("/comment/t1_reply/");
  });

  it("does not change status when the provider fails", async () => {
    publishing.reply.mockRejectedValue(new Error("Zernio refused the reply"));

    const response = await POST(request(), context);

    expect(response.status).toBe(502);
    expect(store.opportunities()[0].status).toBe("pending");
  });

  it("prevents a second reply after successful publishing", async () => {
    publishing.reply.mockResolvedValue({ id: "t1_reply", platform: "reddit", provider: "zernio" });
    expect((await POST(request(), context)).status).toBe(200);

    const duplicate = await POST(request(), context);

    expect(duplicate.status).toBe(409);
    expect(publishing.reply).toHaveBeenCalledTimes(1);
  });
});
