import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContentPage } from "@/components/ContentPage";
import { POST } from "@/app/api/content/route";
import { seedProducts } from "@/lib/seed";
vi.mock("next/navigation", () => ({ usePathname: () => "/content" }));
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
});
