import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesPage } from "@/components/SourcesPage";

vi.mock("@/lib/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/navigation")>()),
  usePathname: () => "/sources",
}));

describe("discovery sources", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      if (url === "/api/sources" && !init)
        return new Response(JSON.stringify([{ id: "r1", channel: "reddit", name: "SideProject", enabled: true, reason: "Product showcase threads", created_at: "2026-01-01" }]));
      if (url === "/api/sources/status")
        return new Response(JSON.stringify({ reddit: { live: false, mode: "demo" }, x: { live: false } }));
      if (url === "/api/sources/suggestions") {
        const channel = JSON.parse(String(init?.body)).channel;
        return new Response(JSON.stringify(channel === "x"
          ? [{ channel: "x", name: "levelsio", reason: "Bootstrapped launches", relevance: 96 }]
          : [{ channel: "reddit", name: "SaaS", reason: "Founder discussions", relevance: 92 }]));
      }
      if (url === "/api/sources" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ id: `new-${body.name}`, enabled: true, created_at: "2026-01-01", ...body }), { status: 201 });
      }
      return new Response(JSON.stringify({ ok: true }));
    }) as typeof fetch;
  });

  it("manages Reddit and X watchlists and adds suggestions", async () => {
    const user = userEvent.setup();
    render(<SourcesPage />);
    expect(await screen.findByText("r/SideProject")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "X accounts" }));
    expect(screen.getByText("No accounts selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /suggest relevant accounts/i }));
    expect(await screen.findByText("@levelsio")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(await screen.findByText("Bootstrapped launches")).toBeInTheDocument();
  });
});
