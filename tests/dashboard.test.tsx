import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    if (String(input).endsWith("/publish") && init?.method === "POST")
      return new Response(
        JSON.stringify({
          ...seedOpportunities[0],
          status: "posted",
          edited_reply: JSON.parse(String(init.body)).text,
          metadata: {
            published: {
              id: "t1_reply",
              url: "https://reddit.com/reply/t1_reply",
            },
          },
        }),
      );
    return new Response("{}");
  }) as typeof fetch;
});
describe("dashboard UI", () => {
  it("displays inbox opportunities without an All tab", async () => {
    render(<Dashboard />);
    expect(
      await screen.findByText(seedOpportunities[0].post_title),
    ).toBeInTheDocument();
    expect(screen.getByText("inbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inbox" })).toHaveClass(
      "selected",
    );
    expect(
      screen.queryByRole("button", { name: "All" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/comments/"),
    );
    expect(
      screen.getByRole("img", { name: "Reddit opportunity" }),
    ).toBeInTheDocument();
  });
  it("uses Replied consistently for published replies", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          opportunities: [
            { ...seedOpportunities[0], status: "posted" as const },
          ],
          products: seedProducts,
          runs: [],
        }),
      ),
    ) as typeof fetch;
    render(<Dashboard />);

    await user.click(await screen.findByRole("button", { name: "Replied" }));

    expect(screen.getByText("replied")).toBeInTheDocument();
    expect(screen.queryByText("posted")).not.toBeInTheDocument();
  });
  it("keeps discovery activity collapsed until requested", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          opportunities: seedOpportunities,
          products: seedProducts,
          runs: [
            {
              id: "completed-run",
              started_at: "2026-08-25T08:00:00.000Z",
              completed_at: "2026-08-25T08:00:10.000Z",
              status: "completed",
              candidates_found: 12,
              opportunities_created: 3,
              error: null,
              metadata: { errors: [] },
            },
            {
              id: "failed-run",
              started_at: "2026-08-24T20:00:00.000Z",
              completed_at: "2026-08-24T20:00:02.000Z",
              status: "failed",
              candidates_found: 0,
              opportunities_created: 0,
              error: "Reddit authentication failed",
              metadata: { errors: [] },
            },
          ],
        }),
      ),
    ) as typeof fetch;
    const user = userEvent.setup();
    render(<Dashboard />);

    const activity = await screen.findByRole("button", { name: /activity/i });
    expect(activity).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("region", { name: "Discovery run log" }),
    ).not.toBeInTheDocument();
    await user.click(activity);

    const log = await screen.findByLabelText("Discovery run log");
    expect(activity).toHaveAttribute("aria-expanded", "true");
    expect(within(log).getByText("Discovery runs")).toBeInTheDocument();
    expect(within(log).getByText("completed")).toBeInTheDocument();
    expect(within(log).getByText("failed")).toBeInTheDocument();
    expect(
      within(log).getByText("Reddit authentication failed"),
    ).toBeInTheDocument();
    expect(within(log).getByText("12")).toBeInTheDocument();
    expect(within(log).getByText("3")).toBeInTheDocument();

    await user.click(within(log).getByRole("button", { name: "Close activity" }));
    expect(activity).toHaveAttribute("aria-expanded", "false");
  });
  it("distinguishes provider warnings from candidate errors", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({
      opportunities: [], products: seedProducts, runs: [{
        id: "partial-run", started_at: "2026-08-25T12:00:00.000Z", completed_at: "2026-08-25T12:00:01.000Z",
        status: "completed", candidates_found: 2, opportunities_created: 0, error: null,
        metadata: { errors: [], provider_errors: ["X watchlist skipped - connect X"], provider_modes: { reddit: "demo" } },
      }],
    }))) as typeof fetch;
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(await screen.findByRole("button", { name: /activity/i }));
    const log = await screen.findByLabelText("Discovery run log");
    expect(within(log).getByText("Demo Reddit data - watchlists were not searched.")).toBeInTheDocument();
    expect(within(log).getByText("X watchlist skipped - connect X")).toBeInTheDocument();
    expect(within(log).getByText("completed with warnings")).toBeInTheDocument();
    expect(within(log).queryByText(/candidate error/i)).not.toBeInTheDocument();
  });

  it("shows an X platform icon for X opportunities", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          opportunities: [
            {
              ...seedOpportunities[0],
              id: "x-opportunity",
              source: "x_api",
              subreddit: "levelsio",
              post_url: "https://x.com/levelsio/status/1",
            },
          ],
          products: seedProducts,
          runs: [],
        }),
      ),
    ) as typeof fetch;
    render(<Dashboard />);

    expect(
      await screen.findByRole("img", { name: "X opportunity" }),
    ).toBeInTheDocument();
  });

  it("does not show a pending duplicate of an already replied post", async () => {
    const replied = {
      ...seedOpportunities[0],
      id: "replied-record",
      status: "posted" as const,
    };
    const duplicate = {
      ...seedOpportunities[0],
      id: "duplicate-pending-record",
      reddit_post_id: "alternate-provider-id",
    };
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          opportunities: [duplicate, replied],
          products: seedProducts,
          runs: [],
        }),
      ),
    ) as typeof fetch;

    render(<Dashboard />);
    await screen.findByRole("heading", { name: "Opportunities" });

    expect(
      screen.queryByLabelText(`Review opportunity: ${duplicate.post_title}`),
    ).not.toBeInTheDocument();
    expect(screen.getByText("No opportunities match")).toBeInTheDocument();
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
  it("confirms, replies, and shows the platform receipt", async () => {
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
      />,
    );
    await u.click(screen.getByRole("button", { name: /reply to post/i }));
    expect(screen.getByText("Post this public reply?")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: "Confirm reply" }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/publish"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByText("Reply posted successfully")).toBeInTheDocument();
    expect(screen.getByText("Comment ID: t1_reply")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view reply/i })).toHaveAttribute(
      "href",
      "https://reddit.com/reply/t1_reply",
    );
    expect(navigation.push).toHaveBeenCalledWith("/");
  });
  it("uses Enter to open and confirm Reply to post", async () => {
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
        nextId="next-id"
      />,
    );
    await u.keyboard("{Enter}");
    expect(screen.getByText("Post this public reply?")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    await u.keyboard("{Enter}");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain("/publish");
    expect(JSON.parse(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body))).toMatchObject({
      text: seedOpportunities[0].proposed_reply,
    });
    expect(await screen.findByText("Comment ID: t1_reply")).toBeInTheDocument();
    expect(navigation.push).toHaveBeenCalledWith("/opportunities/next-id");
  });
  it("uses Backspace to reject and advance", async () => {
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
        nextId="next-id"
      />,
    );

    await u.keyboard("{Backspace}");

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body))).toMatchObject({
      status: "rejected",
    });
    expect(navigation.push).toHaveBeenCalledWith("/opportunities/next-id");
  });
  it("keeps the opportunity pending when Zernio rejects the reply", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Your Zernio plan does not include direct replies" }), { status: 502 }),
    ) as typeof fetch;
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
      />,
    );

    await u.click(screen.getByRole("button", { name: /reply to post/i }));
    await u.click(screen.getByRole("button", { name: "Confirm reply" }));

    expect(await screen.findByText(/plan does not include direct replies/i)).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });
  it("shows a loader while the platform reply is in flight", async () => {
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { finish = resolve; });
    global.fetch = vi.fn(async () => pending) as typeof fetch;
    const u = userEvent.setup();
    render(
      <OpportunityDetail
        initial={seedOpportunities[0]}
        product={seedProducts[0]}
      />,
    );

    await u.click(screen.getByRole("button", { name: /reply to post/i }));
    await u.click(screen.getByRole("button", { name: "Confirm reply" }));

    expect(screen.getByRole("button", { name: /posting reply/i })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for confirmation from the platform");
    finish(new Response(JSON.stringify({
      ...seedOpportunities[0],
      status: "posted",
      metadata: { published: { id: "t1_done" } },
    })));
    expect(await screen.findByText("Comment ID: t1_done")).toBeInTheDocument();
  });
  it("shows a completed state and direct link for a replied opportunity", () => {
    render(
      <OpportunityDetail
        initial={{
          ...seedOpportunities[0],
          status: "posted",
          metadata: { published: { id: "t1_example", url: "https://reddit.com/reply/example" } },
        }}
        product={seedProducts[0]}
      />,
    );

    expect(screen.getByRole("button", { name: "Replied" })).toBeDisabled();
    expect(screen.getByText("Comment ID: t1_example")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view reply/i })).toHaveAttribute(
      "href",
      "https://reddit.com/reply/example",
    );
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
