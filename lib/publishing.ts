import { connectionStore, type Connection, type Platform } from "./connections";

export async function requireConnection(platform: Platform) {
  const connection = await connectionStore.get(platform);
  if (!connection)
    throw new Error(`${platform === "x" ? "X" : "Reddit"} is not connected`);
  if (
    connection.expires_at &&
    +new Date(connection.expires_at) <= Date.now() + 60_000
  )
    return refresh(connection);
  return connection;
}

async function refresh(connection: Connection) {
  if (!connection.refresh_token)
    throw new Error(
      `${connection.platform} authorization expired; reconnect it`,
    );
  const isReddit = connection.platform === "reddit";
  const clientId =
    process.env[isReddit ? "REDDIT_CLIENT_ID" : "X_CLIENT_ID"] || "";
  const secret =
    process.env[isReddit ? "REDDIT_CLIENT_SECRET" : "X_CLIENT_SECRET"] || "";
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refresh_token,
  });
  if (!isReddit && !secret) body.set("client_id", clientId);
  const response = await fetch(
    isReddit
      ? "https://www.reddit.com/api/v1/access_token"
      : "https://api.x.com/2/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(secret
          ? {
              Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
            }
          : {}),
        ...(isReddit
          ? {
              "User-Agent":
                process.env.REDDIT_USER_AGENT || "distribution-agent/1.0",
            }
          : {}),
      },
      body,
    },
  );
  if (!response.ok)
    throw new Error(`Could not refresh ${connection.platform} authorization`);
  const token = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  return connectionStore.save({
    ...connection,
    access_token: token.access_token,
    refresh_token: token.refresh_token || connection.refresh_token,
    expires_at: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null,
    scopes: token.scope?.split(" ") || connection.scopes,
  });
}

export async function publishRedditComment(parentPostId: string, text: string) {
  const connection = await requireConnection("reddit");
  const body = new URLSearchParams({
    api_type: "json",
    thing_id: `t3_${parentPostId}`,
    text,
  });
  const response = await fetch("https://oauth.reddit.com/api/comment", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": process.env.REDDIT_USER_AGENT || "distribution-agent/1.0",
    },
    body,
  });
  const data = (await response.json()) as {
    json?: {
      errors?: unknown[];
      data?: { things?: Array<{ data?: { id?: string; permalink?: string } }> };
    };
  };
  if (!response.ok || data.json?.errors?.length)
    throw new Error("Reddit rejected the comment");
  const comment = data.json?.data?.things?.[0]?.data;
  return {
    id: comment?.id || null,
    url: comment?.permalink ? `https://reddit.com${comment.permalink}` : null,
  };
}

export async function publishXPost(text: string, replyToId?: string) {
  const connection = await requireConnection("x");
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      ...(replyToId ? { reply: { in_reply_to_tweet_id: replyToId } } : {}),
    }),
  });
  const data = (await response.json()) as {
    data?: { id: string; text: string };
    detail?: string;
  };
  if (!response.ok || !data.data)
    throw new Error(data.detail || "X rejected the post");
  return {
    id: data.data.id,
    url: `https://x.com/i/web/status/${data.data.id}`,
  };
}

export async function publishRedditPost(
  subreddit: string,
  title: string,
  text: string,
) {
  const connection = await requireConnection("reddit");
  const body = new URLSearchParams({
    api_type: "json",
    kind: "self",
    sr: subreddit.replace(/^r\//, ""),
    title,
    text,
    resubmit: "true",
  });
  const response = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": process.env.REDDIT_USER_AGENT || "distribution-agent/1.0",
    },
    body,
  });
  const data = (await response.json()) as {
    json?: { errors?: unknown[]; data?: { id?: string; url?: string } };
  };
  if (!response.ok || data.json?.errors?.length)
    throw new Error("Reddit rejected the post");
  return { id: data.json?.data?.id || null, url: data.json?.data?.url || null };
}
