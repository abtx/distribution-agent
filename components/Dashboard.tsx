"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/lib/navigation";
import { useRouter } from "@/lib/navigation";
import {
  ExternalLink,
  LoaderCircle,
  Play,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { DiscoveryRun, Opportunity, Product } from "@/lib/types";
import { Shell } from "./Shell";
function age(s: string) {
  const h = Math.max(
    0,
    Math.floor((Date.now() - new Date(s).getTime()) / 3600000),
  );
  return h < 1
    ? "just now"
    : h < 24
      ? `${h}h ago`
      : `${Math.floor(h / 24)}d ago`;
}
export function Dashboard() {
  const router = useRouter();
  const discoveryRequestActive = useRef(false);
  const [ops, setOps] = useState<Opportunity[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [runs, setRuns] = useState<DiscoveryRun[]>([]),
    [loading, setLoading] = useState(true),
    [running, setRunning] = useState(false),
    [error, setError] = useState("");
  const [status, setStatus] = useState("pending"),
    [product, setProduct] = useState("all"),
    [subreddit, setSubreddit] = useState("all"),
    [threshold, setThreshold] = useState(0),
    [q, setQ] = useState("");
  const load = async () => {
    try {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("Could not load dashboard");
      const d = await r.json();
      setOps(d.opportunities);
      setProducts(d.products);
      setRuns(d.runs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const run = async () => {
    if (discoveryRequestActive.current) return;
    discoveryRequestActive.current = true;
    const progressStartedAt = Date.now();
    setRunning(true);
    setError("");
    try {
      const r = await fetch("/api/discovery", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      const minimumVisibleMs = 1200;
      const remaining = minimumVisibleMs - (Date.now() - progressStartedAt);
      if (remaining > 0)
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      discoveryRequestActive.current = false;
      setRunning(false);
    }
  };
  const filtered = useMemo(
    () =>
      ops
        .filter(
          (o) =>
            (status === "all" || o.status === status) &&
            (product === "all" ||
              (o.matched_product_ids || [o.matched_product_id]).includes(
                product,
              )) &&
            (subreddit === "all" || o.subreddit === subreddit) &&
            o.score >= threshold &&
            `${o.post_title} ${o.post_body} ${o.proposed_reply}`
              .toLowerCase()
              .includes(q.toLowerCase()),
        )
        .sort(
          (a, b) =>
            (a.status === "pending" ? 0 : 1) -
              (b.status === "pending" ? 0 : 1) ||
            b.score - a.score ||
            +new Date(b.created_utc) - +new Date(a.created_utc),
        ),
    [ops, status, product, subreddit, threshold, q],
  );
  const today = new Date().toDateString();
  return (
    <Shell>
      <div className="dashboard-layout">
        <div className="dashboard-main">
      <header>
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Opportunities</h1>
          <p className="muted">
            Fresh, relevant places to talk about what you’re building.
          </p>
        </div>
        <button className="primary" disabled={running} onClick={run}>
          {running ? (
            <LoaderCircle className="spinner" size={16} />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
          {running ? "Running discovery…" : "Run discovery now"}
        </button>
      </header>
      {running && (
        <div className="discovery-progress" role="status" aria-live="polite">
          <LoaderCircle className="spinner" size={21} />
          <div>
            <b>Discovery is running in the background</b>
            <span>
              Searching and qualifying new Reddit opportunities. You can keep
              using the app while this finishes.
            </span>
          </div>
        </div>
      )}
      <section className="stats">
        <Stat
          n={ops.filter((o) => o.status === "pending").length}
          label="Pending"
          tone="orange"
        />
        <Stat
          n={
            ops.filter(
              (o) => new Date(o.discovered_at).toDateString() === today,
            ).length
          }
          label="Found today"
          tone="blue"
        />
        <Stat
          n={ops.filter((o) => o.status === "approved").length}
          label="Done"
          tone="green"
        />
        <Stat
          n={ops.filter((o) => o.status === "rejected").length}
          label="Rejected"
        />
        <div className="stat wide">
          <small>LAST SUCCESSFUL RUN</small>
          <b className="date">
            {runs.find((r) => r.status === "completed")
              ? age(runs.find((r) => r.status === "completed")!.completed_at!)
              : "Not run yet"}
          </b>
          <span>
            {products.filter((p) => p.status === "active").length} products
            monitored
          </span>
        </div>
      </section>
      {error && <div className="alert">{error}</div>}
      <section className="panel">
        <div className="filters">
          <div className="tabs">
            {[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Done" },
              { value: "rejected", label: "Rejected" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setStatus(item.value)}
                className={status === item.value ? "selected" : ""}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search opportunities"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts or replies…"
            />
          </label>
        </div>
        <div className="subfilters">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Product filter"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          >
            <option value="all">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Subreddit filter"
            value={subreddit}
            onChange={(e) => setSubreddit(e.target.value)}
          >
            <option value="all">All sources</option>
            {[...new Set(ops.map((o) => o.subreddit))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <label>
            Min score{" "}
            <input
              aria-label="Minimum score"
              type="number"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(+e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <div className="empty">Loading opportunities…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <b>No opportunities match</b>
            <span>
              Adjust the filters or run discovery to look for fresh threads.
            </span>
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Source post</th>
                  <th>Product</th>
                  <th>Proposed reply</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const matched = (
                    o.matched_product_ids || [o.matched_product_id]
                  )
                    .map((id) =>
                      products.find((candidate) => candidate.id === id),
                    )
                    .filter((candidate): candidate is Product =>
                      Boolean(candidate),
                    );
                  return (
                    <tr
                      className="opportunity-row"
                      key={o.id}
                      tabIndex={0}
                      aria-label={`Review opportunity: ${o.post_title}`}
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            "a, button, input, select, textarea",
                          )
                        )
                          return;
                        router.push(`/opportunities/${o.id}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        router.push(`/opportunities/${o.id}`);
                      }}
                    >
                      <td>
                        <span
                          className={`score ${o.score >= 85 ? "high" : ""}`}
                        >
                          {o.score}
                        </span>
                      </td>
                      <td>
                        <Link className="title" href={`/opportunities/${o.id}`}>
                          {o.post_title}
                        </Link>
                        <div className="meta">
                          {o.source === "x_api" ? o.subreddit : `r/${o.subreddit}`} · {age(o.created_utc)} ·{" "}
                          <a href={o.post_url} target="_blank" rel="noreferrer">
                            Open <ExternalLink size={11} />
                          </a>
                        </div>
                      </td>
                      <td>
                        <b>
                          {matched.map((item) => item.name).join(" + ") ||
                            "Unknown"}
                        </b>
                        <span className="match">
                          {matched.length}{" "}
                          {matched.length === 1 ? "product" : "products"} ·{" "}
                          {o.match_score}% top match
                        </span>
                      </td>
                      <td>
                        <p className="reply">
                          {o.edited_reply || o.proposed_reply}
                        </p>
                      </td>
                      <td>
                        <span className={`chip ${o.status}`}>
                          {o.status === "approved" ? "done" : o.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </div>
        <RunLog runs={runs} manualRunActive={running} />
      </div>
    </Shell>
  );
}

function RunLog({
  runs,
  manualRunActive,
}: {
  runs: DiscoveryRun[];
  manualRunActive: boolean;
}) {
  return (
    <section className="run-sidebar" aria-label="Discovery run log">
      <div className="run-log-heading">
        <div>
          <p className="eyebrow">ACTIVITY</p>
          <h2>Discovery runs</h2>
        </div>
        <span>{runs.length + (manualRunActive ? 1 : 0)}</span>
      </div>
      <div className="run-list" aria-live="polite">
        {manualRunActive && (
          <article className="run-entry running">
            <div className="run-entry-top">
              <b><LoaderCircle className="spinner" size={14} /> Running</b>
              <time>Now</time>
            </div>
            <p>Searching and qualifying Reddit opportunities.</p>
          </article>
        )}
        {runs.map((run) => {
          const errors = Array.isArray(run.metadata.errors)
            ? run.metadata.errors.length
            : 0;
          return (
            <article className={`run-entry ${run.status}`} key={run.id}>
              <div className="run-entry-top">
                <b>{run.status}</b>
                <time dateTime={run.started_at}>
                  {new Date(run.started_at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <dl>
                <div><dt>Candidates</dt><dd>{run.candidates_found}</dd></div>
                <div><dt>Created</dt><dd>{run.opportunities_created}</dd></div>
              </dl>
              {run.status === "running" && <p>Discovery is still in progress.</p>}
              {run.error && <p className="run-error">{run.error}</p>}
              {errors > 0 && (
                <p className="run-error">
                  {errors} candidate {errors === 1 ? "error" : "errors"}
                </p>
              )}
            </article>
          );
        })}
        {!manualRunActive && runs.length === 0 && (
          <div className="run-log-empty">
            <b>No runs yet</b>
            <span>Manual and scheduled discovery runs will appear here.</span>
          </div>
        )}
      </div>
    </section>
  );
}
function Stat({
  n,
  label,
  tone = "",
}: {
  n: number;
  label: string;
  tone?: string;
}) {
  return (
    <div className="stat">
      <small>{label.toUpperCase()}</small>
      <b className={tone}>{n}</b>
    </div>
  );
}
