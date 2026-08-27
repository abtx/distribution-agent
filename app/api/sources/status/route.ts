import { NextResponse } from "@/lib/http";
import { connectionStore } from "@/lib/connections";

export async function GET() {
  const [reddit, x] = await Promise.all([
    connectionStore.get("reddit"),
    connectionStore.get("x"),
  ]);
  const zernioReddit = Boolean(process.env.ZERNIO_API_KEY && process.env.ZERNIO_REDDIT_ACCOUNT_ID);
  return NextResponse.json({
    reddit: {
      live: zernioReddit || (process.env.USE_MOCK_REDDIT === "false" && Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)),
      connected: zernioReddit || Boolean(reddit),
      mode: zernioReddit ? "zernio" : process.env.USE_MOCK_REDDIT === "false" ? "live" : "demo",
    },
    x: {
      live: Boolean(x || process.env.X_BEARER_TOKEN),
      connected: Boolean(x),
    },
  });
}
