import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.REDDIT_CLIENT_ID;
  if (!clientId)
    return NextResponse.json(
      { error: "REDDIT_CLIENT_ID is not configured" },
      { status: 503 },
    );
  const state = randomBytes(24).toString("hex");
  const redirect =
    process.env.REDDIT_REDIRECT_URI ||
    `${new URL(request.url).origin}/api/connections/reddit/callback`;
  const authorize = new URL("https://www.reddit.com/api/v1/authorize");
  authorize.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    state,
    redirect_uri: redirect,
    duration: "permanent",
    scope: "identity read submit",
  }).toString();
  const response = NextResponse.redirect(authorize);
  response.cookies.set("reddit_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    maxAge: 600,
    path: "/",
  });
  return response;
}
