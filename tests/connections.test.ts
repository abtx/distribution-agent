import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as startReddit } from "@/app/api/connections/reddit/start/route";
import { GET as startX } from "@/app/api/connections/x/start/route";
import { GET as redditCallback } from "@/app/api/connections/reddit/callback/route";
import { GET as xCallback } from "@/app/api/connections/x/callback/route";

describe("social OAuth", () => {
  afterEach(() => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.X_CLIENT_ID;
    delete process.env.X_CLIENT_SECRET;
    delete process.env.X_REDIRECT_URI;
    vi.restoreAllMocks();
  });
  it("returns X's safe token error details", async () => {
    process.env.X_CLIENT_ID = "client-id";
    process.env.X_CLIENT_SECRET = "client-secret";
    process.env.X_REDIRECT_URI =
      "http://127.0.0.1:3000/api/connections/x/callback";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          error: "invalid_client",
          error_description: "Value passed for the client was invalid.",
        },
        { status: 401 },
      ),
    );

    const response = await xCallback(
      new Request(
        "http://127.0.0.1:3000/api/connections/x/callback?state=valid&code=code",
        { headers: { cookie: "x_oauth_state=valid; x_oauth_verifier=verifier" } },
      ),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "X token exchange failed",
      upstream_status: 401,
      detail: "invalid_client",
    });
  });
  it("reports missing platform credentials", async () => {
    expect(
      (
        await startReddit(
          new Request("http://localhost/api/connections/reddit/start"),
        )
      ).status,
    ).toBe(503);
    expect(
      (await startX(new Request("http://localhost/api/connections/x/start")))
        .status,
    ).toBe(503);
  });
  it("rejects a callback with an invalid OAuth state", async () => {
    expect(
      (
        await redditCallback(
          new Request(
            "http://localhost/api/connections/reddit/callback?state=forged&code=x",
          ),
        )
      ).status,
    ).toBe(400);
  });
});
