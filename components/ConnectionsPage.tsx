"use client";
import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Link2,
  Unplug,
} from "lucide-react";
import { Shell } from "./Shell";

type Summary = {
  platform: "reddit" | "x";
  account_name: string;
  scopes: string[];
  connected_at: string;
};
type PlatformConfiguration = {
  configured: boolean;
  callbackUrl: string;
  missing: string[];
};
type Configuration = Record<"reddit" | "x", PlatformConfiguration>;

export function ConnectionsPage() {
  const [connections, setConnections] = useState<Summary[]>([]);
  const [configuration, setConfiguration] = useState<Configuration | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    const [connectionsResponse, configurationResponse] = await Promise.all([
      fetch("/api/connections"),
      fetch("/api/connections/configuration"),
    ]);
    if (!connectionsResponse.ok || !configurationResponse.ok) {
      setError("Could not load connections");
      setLoading(false);
      return;
    }
    setConnections(await connectionsResponse.json());
    setConfiguration(await configurationResponse.json());
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const disconnect = async (platform: "reddit" | "x") => {
    if (
      !window.confirm(
        `Disconnect ${platform === "x" ? "X" : "Reddit"}? Scheduled publishing to it will stop.`,
      )
    )
      return;
    await fetch(`/api/connections?platform=${platform}`, { method: "DELETE" });
    await load();
  };
  return (
    <Shell>
      <header>
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>Connections</h1>
          <p className="muted">
            Authorize Distribution Agent to publish only when you ask it to.
          </p>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      <div className="connection-grid">
        {(["reddit", "x"] as const).map((platform) => {
          const connected = connections.find(
            (item) => item.platform === platform,
          );
          const label = platform === "x" ? "X" : "Reddit";
          return (
            <section className="card connection-card" key={platform}>
              <div className="connection-heading">
                <span className="channel-logo">
                  {platform === "x" ? "𝕏" : "r/"}
                </span>
                <div>
                  <h2>{label}</h2>
                  <p>
                    {platform === "x"
                      ? "Publish updates and replies"
                      : "Reply to opportunities and publish posts"}
                  </p>
                </div>
              </div>
              {loading ? (
                <p className="muted">Checking connection…</p>
              ) : connected ? (
                <>
                  <p className="connected">
                    <CheckCircle2 size={16} /> Connected as{" "}
                    <b>{connected.account_name}</b>
                  </p>
                  <button
                    className="secondary danger-text"
                    onClick={() => disconnect(platform)}
                  >
                    <Unplug size={14} /> Disconnect
                  </button>
                </>
              ) : configuration?.[platform].configured ? (
                <a
                  className="primary connect-link"
                  href={`/api/connections/${platform}/start`}
                >
                  <Link2 size={15} /> Connect {label}
                </a>
              ) : (
                <div className="setup-needed">
                  <b>Setup required before connecting</b>
                  <span>
                    Missing {configuration?.[platform].missing.join(" and ")}
                  </span>
                  <a href={`#setup-${platform}`}>Follow the setup guide ↓</a>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <section className="setup-section">
        <div>
          <p className="eyebrow">FIRST-TIME SETUP</p>
          <h2>How to connect your accounts</h2>
          <p className="muted">
            You only do this once per platform. Distribution Agent never shows
            your secret or access tokens in the browser.
          </p>
        </div>
        {configuration && (
          <>
            <SetupGuide
              platform="reddit"
              callbackUrl={configuration.reddit.callbackUrl}
            />
            <SetupGuide
              platform="x"
              callbackUrl={configuration.x.callbackUrl}
            />
          </>
        )}
      </section>
      <div className="notice">
        After editing <code>.env.local</code>, restart the app, return here, and
        click Connect. OAuth tokens are stored in{" "}
        <code>.data/connections.json</code> with user-only file permissions.
      </div>
    </Shell>
  );
}

function SetupGuide({
  platform,
  callbackUrl,
}: {
  platform: "reddit" | "x";
  callbackUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const reddit = platform === "reddit";
  const label = reddit ? "Reddit" : "X";
  const portal = reddit
    ? "https://www.reddit.com/prefs/apps"
    : "https://developer.x.com/en/portal/dashboard";
  const copy = async () => {
    await navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <details className="setup-guide" id={`setup-${platform}`} open={reddit}>
      <summary>
        <span className="step-number">{reddit ? "1" : "2"}</span>
        <span>
          <b>Connect {label}</b>
          <small>
            {reddit
              ? "Create a Reddit Data API OAuth application"
              : "Create an X OAuth 2.0 application with write access"}
          </small>
        </span>
        <ChevronDown size={18} />
      </summary>
      <ol>
        <li>
          <b>
            {reddit
              ? "Request Reddit Data API approval first."
              : `Open the ${label} developer portal.`}
          </b>{" "}
          <a
            href={
              reddit
                ? "https://support.reddithelp.com/hc/en-us/requests/new?tf_42139884615700=api_request_type_developer_clone&ticket_form_id=14868593862164"
                : portal
            }
            target="_blank"
            rel="noreferrer"
          >
            {reddit
              ? "Open Reddit’s developer access request"
              : `Open ${label} developer portal`}{" "}
            <ExternalLink size={13} />
          </a>
          {reddit && (
            <p>
              The message on the old Create App form means Reddit has not
              approved this account/use case yet. Changing the About URL or
              redirect URI will not remove it.
            </p>
          )}
        </li>
        <li>
          <b>
            {reddit
              ? "Complete Reddit’s API registration."
              : "Open User authentication settings."}
          </b>
          {reddit ? (
            <div className="application-help">
              <p>
                Choose the developer/bot or app option. Describe the tool
                accurately and emphasize that every reply requires a human
                review and explicit approval.
              </p>
              <b>Suggested use-case description</b>
              <pre>
                Distribution Agent is a private, non-commercial tool used only
                by its owner. It searches a limited set of relevant communities
                for recent threads that explicitly invite product sharing, then
                drafts a contextual reply. A human reviews, edits, approves, and
                separately confirms every comment before it is posted. It does
                not vote, send private messages, scrape pages, train AI models
                on Reddit data, or mass-post identical content. It uses OAuth,
                identifies itself with a descriptive user agent, respects API
                rate limits, and stores only the minimum data needed for review.
              </pre>
              <b>Why Devvit does not fit</b>
              <pre>
                This is a private local dashboard that combines owner-authorized
                Reddit activity with the owner’s other marketing channels. It is
                not an embedded subreddit application or moderator tool, so it
                requires the Reddit Data API and OAuth callback support outside
                Devvit.
              </pre>
              <p>
                List only the subreddits you genuinely intend to monitor. Reddit
                prohibits spam and identical or substantially similar automated
                posts across communities.
              </p>
            </div>
          ) : (
            <p>
              Enable OAuth 2.0, choose Web App / Automated App or Bot, and set
              permissions to Read and write.
            </p>
          )}
        </li>
        {reddit && (
          <li>
            <b>
              After Reddit approves the request, open the{" "}
              <a href={portal} target="_blank" rel="noreferrer">
                Create App page <ExternalLink size={13} />
              </a>{" "}
              and fill in:
            </b>
            <dl className="field-guide">
              <div>
                <dt>Name</dt>
                <dd>Distribution Agent</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>web app</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>
                  Personal local marketing assistant for finding relevant Reddit
                  conversations and publishing owner-approved replies.
                </dd>
              </div>
              <div>
                <dt>About URL</dt>
                <dd>
                  <code>http://localhost:3000</code>
                </dd>
              </div>
            </dl>
            <p>
              The About URL is informational. For a local-only tool,
              <code> http://localhost:3000</code> is appropriate; the Redirect
              URI below is the value that must match exactly.
            </p>
          </li>
        )}
        <li>
          <b>Paste this exact callback URL:</b>
          <div className="callback-copy">
            <code>{callbackUrl}</code>
            <button
              type="button"
              onClick={copy}
              aria-label={`Copy ${label} callback URL`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </li>
        <li>
          <b>
            Copy the credentials into <code>.env.local</code>:
          </b>
          <pre>
            {reddit
              ? `REDDIT_CLIENT_ID=your_client_id\nREDDIT_CLIENT_SECRET=your_client_secret\nREDDIT_REDIRECT_URI=${callbackUrl}\nREDDIT_USER_AGENT=distribution-agent/1.0 by your_reddit_username`
              : `X_CLIENT_ID=your_client_id\nX_CLIENT_SECRET=your_client_secret_if_shown\nX_REDIRECT_URI=${callbackUrl}`}
          </pre>
          <p>
            {reddit
              ? "On Reddit’s app card, the client ID is the short value directly under the app name; the secret is labelled “secret”."
              : "For a public PKCE client, X may not provide or require a client secret. The client ID is always required."}
          </p>
        </li>
        <li>
          <b>Restart Distribution Agent and return to this page.</b>
          <p>
            Click <strong>Connect {label}</strong>, review the permissions on{" "}
            {label}, and authorize your account.
          </p>
        </li>
      </ol>
    </details>
  );
}
