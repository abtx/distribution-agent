import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId)
    return NextResponse.json(
      { error: "X_CLIENT_ID is not configured" },
      { status: 503 },
    );
  const state = randomBytes(24).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirect =
    process.env.X_REDIRECT_URI ||
    `${new URL(request.url).origin}/api/connections/x/callback`;
  const authorize = new URL("https://x.com/i/oauth2/authorize");
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirect,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  const response = NextResponse.redirect(authorize);
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(request.url).protocol === "https:",
    maxAge: 600,
    path: "/",
  };
  response.cookies.set("x_oauth_state", state, options);
  response.cookies.set("x_oauth_verifier", verifier, options);
  return response;
}
