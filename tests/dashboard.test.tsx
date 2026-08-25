import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "@/components/Dashboard";
import { OpportunityDetail } from "@/components/OpportunityDetail";
import { seedOpportunities, seedProducts } from "@/lib/seed";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
beforeEach(() => {
  global.fetch = vi.fn(async (input, init) => {
    if (String(input) === "/api/dashboard")
      return new Response(
        JSON.stringify({
          opportunities: seedOpportunities,
          products: seedProducts,
          runs: [],
        }),
      );
    if (init?.method === "PATCH")
      return new Response(
        JSON.stringify({
          ...seedOpportunities[0],
          ...JSON.parse(String(init.body)),
        }),
      );
    return new Response("{}");
  }) as typeof fetch;
});
describe("dashboard UI", () => {
  it("displays pending opportunities", async () => {
    render(<Dashboard />);
    expect(
      await screen.findByText(seedOpportunities[0].post_title),
    ).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });
  it("approve and reject work", async () => {
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
      />,
    );
    await u.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities/"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await u.click(screen.getByRole("button", { name: /reject/i }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
  it("editing a proposed reply can be saved", async () => {
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
      />,
    );
    const box = screen.getByLabelText("Proposed reply");
    await u.clear(box);
    await u.type(box, "A newly edited reply with enough useful detail.");
    await u.click(screen.getByRole("button", { name: "Save edit" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
