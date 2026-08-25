import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/discover/route";
describe("cron", () => {
  beforeEach(() => (process.env.CRON_SECRET = "secret"));
  it("rejects an unauthenticated request", async () =>
    expect((await GET(new Request("http://x/api/cron/discover"))).status).toBe(
      401,
    ));
  it("runs with the correct secret", async () =>
    expect(
      (
        await GET(
          new Request("http://x/api/cron/discover", {
            headers: { authorization: "Bearer secret" },
          }),
        )
      ).status,
    ).toBe(200));
});
