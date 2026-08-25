import { NextResponse } from "next/server";
import { connectionStore } from "@/lib/connections";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.match(/(?:^|; )reddit_oauth_state=([^;]+)/)?.[1];
  if (!state || !cookieState || state !== decodeURIComponent(cookieState))
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  const code = url.searchParams.get("code");
  const clientId = process.env.REDDIT_CLIENT_ID || "";
  const secret = process.env.REDDIT_CLIENT_SECRET || "";
  if (!code || !clientId || !secret)
    return NextResponse.json(
      { error: "Reddit authorization is incomplete" },
      { status: 400 },
    );
  const redirectUri =
    process.env.REDDIT_REDIRECT_URI ||
    `${url.origin}/api/connections/reddit/callback`;
  const tokenResponse = await fetch(
    "https://www.reddit.com/api/v1/access_token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": process.env.REDDIT_USER_AGENT || "distribution-agent/1.0",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    },
  );
  if (!tokenResponse.ok)
    return NextResponse.json(
      { error: "Reddit token exchange failed" },
      { status: 502 },
    );
  const token = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  const meResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": process.env.REDDIT_USER_AGENT || "distribution-agent/1.0",
    },
  });
  if (!meResponse.ok)
    return NextResponse.json(
      { error: "Could not load Reddit account" },
      { status: 502 },
    );
  const me = (await meResponse.json()) as { id: string; name: string };
  await connectionStore.save({
    platform: "reddit",
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    expires_at: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null,
    account_id: me.id,
    account_name: me.name,
    scopes: token.scope?.split(" ") || [],
    connected_at: new Date().toISOString(),
  });
  const response = NextResponse.redirect(
    `${url.origin}/connections?connected=reddit`,
  );
  response.cookies.delete("reddit_oauth_state");
  return response;
}
