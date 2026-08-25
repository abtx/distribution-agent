import { afterEach, describe, expect, it } from "vitest";
import { GET as startReddit } from "@/app/api/connections/reddit/start/route";
import { GET as startX } from "@/app/api/connections/x/start/route";
import { GET as redditCallback } from "@/app/api/connections/reddit/callback/route";

describe("social OAuth", () => {
  afterEach(() => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.X_CLIENT_ID;
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
