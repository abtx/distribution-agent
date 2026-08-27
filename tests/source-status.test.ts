import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/sources/status/route";

afterEach(() => {
  delete process.env.ZERNIO_API_KEY;
  delete process.env.ZERNIO_REDDIT_ACCOUNT_ID;
});

describe("source provider status", () => {
  it("reports Zernio as the active Reddit provider when configured", async () => {
    process.env.ZERNIO_API_KEY = "secret";
    process.env.ZERNIO_REDDIT_ACCOUNT_ID = "reddit-account";
    const response = await GET();
    const status = await response.json();
    expect(status.reddit).toMatchObject({ live: true, connected: true, mode: "zernio" });
  });
});
