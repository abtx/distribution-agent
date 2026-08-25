import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WatchlistReviewPage } from "@/components/WatchlistReviewPage";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/lib/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/navigation")>()),
  usePathname: () => "/sources/review",
  useRouter: () => ({ push: navigation.push }),
}));

describe("guided watchlist review", () => {
  beforeEach(() => {
    navigation.push.mockReset();
    global.fetch = vi.fn(async (input, init) => {
      if (String(input) === "/api/sources") return new Response(JSON.stringify([
        { id: "one", channel: "reddit", name: "SideProject", enabled: true, reason: "Build threads", created_at: "2026-01-01" },
        { id: "two", channel: "reddit", name: "saasinvestors", enabled: true, reason: "Manual", created_at: "2026-01-01" },
      ]));
      if (String(input) === "/api/opportunities/import" && init?.method === "POST")
        return new Response(JSON.stringify({ id: "imported" }), { status: 201 });
      return new Response("{}");
    }) as typeof fetch;
  });

  it("steps through communities and imports a selected post", async () => {
    const user = userEvent.setup();
    render(<WatchlistReviewPage />);
    expect(await screen.findByText("r/SideProject")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open newest posts/i })).toHaveAttribute("href", "https://www.reddit.com/r/SideProject/new/");
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("r/saasinvestors")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Reddit post URL"), "https://www.reddit.com/r/saasinvestors/comments/abc/post/");
    await user.type(screen.getByLabelText("Post title"), "Drop your SaaS");
    await user.type(screen.getByLabelText("Post text"), "Share what you are building");
    await user.click(screen.getByRole("button", { name: /analyse and add/i }));
    expect(navigation.push).toHaveBeenCalledWith("/opportunities/imported");
  });
});
