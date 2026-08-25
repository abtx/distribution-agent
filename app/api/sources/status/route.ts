import { NextResponse } from "@/lib/http";
import { connectionStore } from "@/lib/connections";

export async function GET() {
  const [reddit, x] = await Promise.all([
    connectionStore.get("reddit"),
    connectionStore.get("x"),
  ]);
  return NextResponse.json({
    reddit: {
      live: process.env.USE_MOCK_REDDIT === "false" && Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
      connected: Boolean(reddit),
      mode: process.env.USE_MOCK_REDDIT === "false" ? "live" : "demo",
    },
    x: {
      live: Boolean(x || process.env.X_BEARER_TOKEN),
      connected: Boolean(x),
    },
  });
}
