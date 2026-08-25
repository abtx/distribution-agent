import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContentPage } from "@/components/ContentPage";
import { POST } from "@/app/api/content/route";
import { seedProducts } from "@/lib/seed";
import type { ContentItem } from "@/lib/types";
vi.mock("@/lib/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/navigation")>()),
  usePathname: () => "/content",
}));
describe("multi-channel content", () => {
  beforeEach(() => {
    history.replaceState({}, "", "/");
    global.fetch = vi.fn(async (input, init) => {
      if (String(input) === "/api/content" && !init)
        return new Response(JSON.stringify([]));
      if (String(input) === "/api/products")
        return new Response(JSON.stringify(seedProducts));
      return new Response(
        JSON.stringify({ id: "new", ...JSON.parse(String(init?.body)) }),
        { status: 201 },
      );
    }) as typeof fetch;
  });
  it("offers X and Reddit for text posts", async () => {
    render(<ContentPage />);
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Reddit")).toBeInTheDocument();
    expect(screen.queryByText("YouTube")).not.toBeInTheDocument();
  });
  it("switches to a multi-service video batch", async () => {
    const user = userEvent.setup();
    render(<ContentPage />);
    await user.click(screen.getByRole("button", { name: /video batch/i }));
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("TikTok")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload video")).toBeInTheDocument();
  });
  it("rejects unsupported post destinations server-side", async () => {
    const req = new Request("http://local/api/content", {
      method: "POST",
      body: JSON.stringify({
        kind: "post",
        title: "Update",
        body: "News",
        channels: ["youtube"],
        targets: [],
        product_id: null,
        asset_name: null,
        asset_url: null,
        status: "draft",
        scheduled_at: null,
      }),
    });
    expect((await POST(req)).status).toBe(400);
  });
  it("edits queued content and persists the changes", async () => {
    const item: ContentItem = {
      id: "draft-1", kind: "post", title: "August build update", body: "Original copy",
      product_id: null, channels: ["x", "reddit"], targets: ["r/SideProject"],
      asset_name: null, asset_url: null, status: "draft", scheduled_at: null,
      publications: {}, created_at: "2026-08-25T08:00:00Z", updated_at: "2026-08-25T08:00:00Z",
    };
    let saved = item;
    global.fetch = vi.fn(async (input, init) => {
      if (String(input) === "/api/products") return new Response(JSON.stringify(seedProducts));
      if (String(input) === "/api/content" && !init) return new Response(JSON.stringify([saved]));
      if (String(input) === "/api/content/draft-1" && init?.method === "PATCH") {
        saved = { ...saved, ...JSON.parse(String(init.body)) };
        return new Response(JSON.stringify(saved));
      }
      return new Response("{}");
    }) as typeof fetch;
    const user = userEvent.setup();
    render(<ContentPage />);
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Edit post copy"));
    await user.type(screen.getByLabelText("Edit post copy"), "Updated campaign copy");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Updated campaign copy")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/content/draft-1", expect.objectContaining({ method: "PATCH" }));
  });
});
