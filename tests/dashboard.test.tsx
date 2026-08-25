import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "@/components/Dashboard";
import { OpportunityDetail } from "@/components/OpportunityDetail";
import { seedOpportunities, seedProducts } from "@/lib/seed";
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/lib/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/navigation")>()),
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
  it("uses Done consistently for completed reviews", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          opportunities: [
            { ...seedOpportunities[0], status: "approved" as const },
          ],
          products: seedProducts,
          runs: [],
        }),
      ),
    ) as typeof fetch;
    render(<Dashboard />);

    await user.click(await screen.findByRole("button", { name: "Done" }));

    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.queryByText("approved")).not.toBeInTheDocument();
  });
  it("shows an animated background status while discovery is running", async () => {
    let finishDiscovery!: (response: Response) => void;
    const discovery = new Promise<Response>((resolve) => {
      finishDiscovery = resolve;
    });
    global.fetch = vi.fn(async (input, init) => {
      if (String(input) === "/api/discovery" && init?.method === "POST")
        return discovery;
      if (String(input) === "/api/dashboard")
        return new Response(
          JSON.stringify({
            opportunities: seedOpportunities,
            products: seedProducts,
            runs: [],
          }),
        );
      return new Response("{}");
    }) as typeof fetch;
    const user = userEvent.setup();
    render(<Dashboard />);
    await screen.findByText(seedOpportunities[0].post_title);

    await user.dblClick(
      screen.getByRole("button", { name: "Run discovery now" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Discovery is running in the background",
    );
    expect(
      screen.getByRole("button", { name: /running discovery/i }),
    ).toBeDisabled();
    expect(
      vi.mocked(global.fetch).mock.calls.filter(
        ([input]) => String(input) === "/api/discovery",
      ),
    ).toHaveLength(1);

    finishDiscovery(new Response("{}"));
    await waitFor(
      () => expect(screen.queryByRole("status")).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
  });
  it("opens an opportunity from the entire table row", async () => {
    const u = userEvent.setup();
    render(<Dashboard />);
    const row = await screen.findByLabelText(
      `Review opportunity: ${seedOpportunities[0].post_title}`,
    );

    await u.click(row);
    expect(navigation.push).toHaveBeenCalledWith(
      `/opportunities/${seedOpportunities[0].id}`,
    );
    navigation.push.mockReset();
    row.focus();
    await u.keyboard("{Enter}");
    expect(navigation.push).toHaveBeenCalledWith(
      `/opportunities/${seedOpportunities[0].id}`,
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
  it("marks opportunities done or rejected and advances", async () => {
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
      />,
    );
    await u.click(screen.getByRole("button", { name: /done/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/opportunities/"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    expect(navigation.push).toHaveBeenCalledWith("/");
    await u.click(screen.getByRole("button", { name: /reject/i }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
  it("uses Enter for Done and Backspace for Reject outside fields", async () => {
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
        nextId="next-id"
      />,
    );
    await u.keyboard("{Enter}");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body))).toMatchObject({
      status: "approved",
    });
    expect(navigation.push).toHaveBeenCalledWith("/opportunities/next-id");

    await u.keyboard("{Backspace}");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1]?.body))).toMatchObject({
      status: "rejected",
    });
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
  it("copies the current reply text", async () => {
    const u = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
      />,
    );

    await u.click(screen.getByRole("button", { name: /copy reply/i }));
    expect(writeText).toHaveBeenCalledWith(seedOpportunities[0].proposed_reply);
    expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
  });
});
