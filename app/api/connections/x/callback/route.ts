import { NextResponse } from "@/lib/http";
import { connectionStore } from "@/lib/connections";

function cookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  if (
    !state ||
    state !== decodeURIComponent(cookie(request, "x_oauth_state") || "")
  )
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  const code = url.searchParams.get("code");
  const verifier = decodeURIComponent(
    cookie(request, "x_oauth_verifier") || "",
  );
  const clientId = process.env.X_CLIENT_ID || "";
  const secret = process.env.X_CLIENT_SECRET || "";
  if (!code || !verifier || !clientId)
    return NextResponse.json(
      { error: "X authorization is incomplete" },
      { status: 400 },
    );
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri:
      process.env.X_REDIRECT_URI || `${url.origin}/api/connections/x/callback`,
    code_verifier: verifier,
  });
  if (!secret) body.set("client_id", clientId);
  const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(secret
        ? {
            Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
          }
        : {}),
    },
    body,
  });
  if (!tokenResponse.ok)
    return NextResponse.json(
      { error: "X token exchange failed" },
      { status: 502 },
    );
  const token = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  const meResponse = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!meResponse.ok)
    return NextResponse.json(
      { error: "Could not load X account" },
      { status: 502 },
    );
  const me = (await meResponse.json()) as {
    data: { id: string; username: string };
  };
  await connectionStore.save({
    platform: "x",
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    expires_at: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null,
    account_id: me.data.id,
    account_name: `@${me.data.username}`,
    scopes: token.scope?.split(" ") || [],
    connected_at: new Date().toISOString(),
  });
  const response = NextResponse.redirect(
    `${url.origin}/connections?connected=x`,
  );
  response.cookies.delete("x_oauth_state");
  response.cookies.delete("x_oauth_verifier");
  return response;
}
