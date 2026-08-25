import { NextResponse } from "@/lib/http";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    reddit: {
      configured: Boolean(
        process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET,
      ),
      callbackUrl:
        process.env.REDDIT_REDIRECT_URI ||
        `${origin}/api/connections/reddit/callback`,
      missing: [
        !process.env.REDDIT_CLIENT_ID && "REDDIT_CLIENT_ID",
        !process.env.REDDIT_CLIENT_SECRET && "REDDIT_CLIENT_SECRET",
      ].filter(Boolean),
    },
    x: {
      configured: Boolean(process.env.X_CLIENT_ID),
      callbackUrl:
        process.env.X_REDIRECT_URI ||
        "http://127.0.0.1:3000/api/connections/x/callback",
      missing: [!process.env.X_CLIENT_ID && "X_CLIENT_ID"].filter(Boolean),
    },
  });
}
