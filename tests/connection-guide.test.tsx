import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionsPage } from "@/components/ConnectionsPage";

vi.mock("@/lib/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/navigation")>()),
  usePathname: () => "/connections",
}));

describe("connection setup guide", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/configuration"))
          return new Response(
            JSON.stringify({
              reddit: {
                configured: false,
                callbackUrl:
                  "http://localhost:3000/api/connections/reddit/callback",
                missing: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"],
              },
              x: {
                configured: false,
                callbackUrl: "http://localhost:3000/api/connections/x/callback",
                missing: ["X_CLIENT_ID"],
              },
            }),
          );
        return new Response(JSON.stringify([]));
      }),
    );
  });

  it("shows exact, actionable Reddit and X setup instructions", async () => {
    render(<ConnectionsPage />);
    expect(
      await screen.findAllByText(
        "Setup required before connecting",
        {},
        { timeout: 2000 },
      ),
    ).toHaveLength(2);
    expect(screen.getByText("How to connect your accounts")).toBeVisible();
    expect(
      screen.getByText("Create a Reddit Data API OAuth application"),
    ).toBeVisible();
    expect(
      screen.getByText("Create an X OAuth 2.0 application with write access"),
    ).toBeVisible();
    expect(
      screen.getByText("REDDIT_CLIENT_ID=your_client_id", { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("X_CLIENT_ID=your_client_id", { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Reddit callback URL" }),
    ).toBeEnabled();
  });
});
