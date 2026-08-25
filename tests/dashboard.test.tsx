import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "@/components/Dashboard";
import { OpportunityDetail } from "@/components/OpportunityDetail";
import { seedOpportunities, seedProducts } from "@/lib/seed";
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: navigation.push }),
}));
beforeEach(() => {
  navigation.push.mockReset();
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
    expect(screen.getByRole("link", { name: /open/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/comments/"),
    );
  });

  it("opens the specific Reddit post from opportunity details", () => {
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
      />,
    );
    expect(
      screen.getByRole("link", { name: /open reddit post/i }),
    ).toHaveAttribute("href", seedOpportunities[0].post_url);
    expect(seedOpportunities[0].post_url).toContain("/comments/");
  });
  it("navigates between opportunities with controls and arrow keys", async () => {
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
        previousId="previous-id"
        nextId="next-id"
        position={2}
        total={3}
      />,
    );
    expect(screen.getByRole("link", { name: /previous opportunity/i })).toHaveAttribute(
      "href",
      "/opportunities/previous-id",
    );
    expect(screen.getByRole("link", { name: /next opportunity/i })).toHaveAttribute(
      "href",
      "/opportunities/next-id",
    );
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    await u.keyboard("{ArrowRight}");
    expect(navigation.push).toHaveBeenCalledWith("/opportunities/next-id");
    await u.click(screen.getByLabelText("Proposed reply"));
    await u.keyboard("{ArrowLeft}");
    expect(navigation.push).toHaveBeenCalledTimes(1);
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
