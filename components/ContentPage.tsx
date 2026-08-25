"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileVideo, Plus, Send } from "lucide-react";
import { Shell } from "./Shell";
import { ChannelBadge } from "./ChannelBadge";
import type { ContentItem, MarketingChannel, Product } from "@/lib/types";
const textChannels: MarketingChannel[] = ["x", "reddit"],
  videoChannels: MarketingChannel[] = [
    "youtube",
    "tiktok",
    "instagram",
    "x",
    "linkedin",
  ];
export function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [kind, setKind] = useState<"post" | "video">("post"),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [product, setProduct] = useState(""),
    [channels, setChannels] = useState<MarketingChannel[]>(["x"]),
    [targets, setTargets] = useState(""),
    [scheduled, setScheduled] = useState(""),
    [asset, setAsset] = useState<{ name: string; url: string } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = async () => {
    const [c, p] = await Promise.all([
      fetch("/api/content").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    setItems(c);
    setProducts(p);
  };
  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const url = params.get("asset");
    const name = params.get("name");
    if (url && name) {
      setKind("video");
      setChannels(["youtube"]);
      setAsset({ url, name });
    }
  }, []);
  const allowed = kind === "post" ? textChannels : videoChannels;
  const chooseKind = (k: "post" | "video") => {
    setKind(k);
    setChannels(k === "post" ? ["x"] : ["youtube"]);
    setError("");
  };
  const toggle = (c: MarketingChannel) =>
    setChannels((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]));
  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("video", file);
    const r = await fetch("/api/videos", { method: "POST", body: fd }),
      d = await r.json();
    setBusy(false);
    if (!r.ok) setError(d.error);
    else setAsset({ name: d.name, url: d.url });
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      scheduled &&
      !window.confirm(
        `Schedule this public post for ${new Date(scheduled).toLocaleString()}? It will publish automatically.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    const status = scheduled ? "scheduled" : "draft";
    const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          body,
          product_id: product || null,
          channels,
          targets: targets
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          asset_name: asset?.name || null,
          asset_url: asset?.url || null,
          status,
          scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
        }),
      }),
      d = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setTitle("");
    setBody("");
    setTargets("");
    setScheduled("");
    setAsset(null);
    await load();
  };
  const publish = async (item: ContentItem) => {
    if (
      !window.confirm(
        `Publish “${item.title}” to ${item.channels.join(", ")} now?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/content/${item.id}/publish`, {
      method: "POST",
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) setError(data.error || "Publishing failed");
    await load();
  };
  const upcoming = useMemo(
    () =>
      items.filter((x) => x.status === "scheduled" || x.status === "queued"),
    [items],
  );
  return (
    <Shell>
      <header>
        <div>
          <p className="eyebrow">PUBLISHING WORKSPACE</p>
          <h1>Content</h1>
          <p className="muted">
            Prepare one update, then route it to the right channels.
          </p>
        </div>
        <div className="mode">
          <button
            className={kind === "post" ? "selected" : ""}
            onClick={() => chooseKind("post")}
          >
            <Send size={15} /> Text post
          </button>
          <button
            className={kind === "video" ? "selected" : ""}
            onClick={() => chooseKind("video")}
          >
            <FileVideo size={15} /> Video batch
          </button>
        </div>
      </header>
      <div className="contentgrid">
        <form className="panel composer" onSubmit={create}>
          <div>
            <p className="eyebrow">NEW {kind.toUpperCase()}</p>
            <h2>
              {kind === "post"
                ? "Write once, tailor by destination"
                : "Queue a video everywhere it belongs"}
            </h2>
          </div>
          {error && <div className="alert">{error}</div>}
          <label>
            Internal title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "post"
                  ? "August product update"
                  : "ReelBlocks canvas demo"
              }
            />
          </label>
          <label>
            {kind === "post" ? "Post copy" : "Caption"}
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What do you want to say?"
            />
          </label>
          {kind === "video" && (
            <div className="assetpicker">
              <label className="drop">
                <FileVideo size={22} />
                <b>{asset?.name || "Choose a video"}</b>
                <span>
                  {asset
                    ? "Ready for this batch"
                    : "MP4, MOV or WebM · up to 500 MB"}
                </span>
                <input
                  aria-label="Upload video"
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    e.target.files?.[0] && void upload(e.target.files[0])
                  }
                />
              </label>
              <a href="/videos">Or select from the video library</a>
            </div>
          )}
          <label>
            Product
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">No product</option>
              {products
                .filter((p) => p.status === "active")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <fieldset>
            <legend>Channels</legend>
            <div className="channelchoices">
              {allowed.map((c) => (
                <label key={c} className={channels.includes(c) ? "on" : ""}>
                  <input
                    type="checkbox"
                    checked={channels.includes(c)}
                    onChange={() => toggle(c)}
                  />
                  <ChannelBadge channel={c} />
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            {kind === "post"
              ? "People, communities or groups"
              : "Campaign tags"}
            <input
              value={targets}
              onChange={(e) => setTargets(e.target.value)}
              placeholder={
                kind === "post"
                  ? "r/SideProject, @indiehackers (comma-separated)"
                  : "launch, tutorial"
              }
            />
          </label>
          <label>
            Schedule (optional)
            <input
              type="datetime-local"
              value={scheduled}
              onChange={(e) => setScheduled(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy || channels.length === 0}>
            {scheduled ? <CalendarClock size={16} /> : <Plus size={16} />}{" "}
            {busy
              ? "Saving…"
              : scheduled
                ? "Schedule across channels"
                : `Save ${kind}`}
          </button>
        </form>
        <section className="panel queue">
          <div className="queuehead">
            <div>
              <p className="eyebrow">QUEUE</p>
              <h2>{upcoming.length} scheduled or ready</h2>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="empty">
              <b>Your content queue is empty</b>
              <span>Create a text post or video batch to get started.</span>
            </div>
          ) : (
            items.map((item) => (
              <article className="queueitem" key={item.id}>
                <div className="kindicon">
                  {item.kind === "video" ? (
                    <FileVideo size={17} />
                  ) : (
                    <Send size={17} />
                  )}
                </div>
                <div>
                  <b>{item.title}</b>
                  <p>{item.body}</p>
                  <div className="channelrow">
                    {item.channels.map((c) => (
                      <ChannelBadge key={c} channel={c} />
                    ))}
                    {item.targets.map((t) => (
                      <span className="target" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="queuestatus">
                  <span className={`chip ${item.status}`}>{item.status}</span>
                  <small>
                    {item.scheduled_at
                      ? new Date(item.scheduled_at).toLocaleString()
                      : "Unscheduled draft"}
                  </small>
                  {Object.entries(item.publications || {}).map(
                    ([channel, publication]) =>
                      publication?.url && (
                        <a
                          className="published-link"
                          href={publication.url}
                          target="_blank"
                          rel="noreferrer"
                          key={channel}
                        >
                          View on {channel === "x" ? "X" : "Reddit"}
                        </a>
                      ),
                  )}
                  {item.kind === "post" && item.status !== "published" && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => publish(item)}
                    >
                      <Send size={13} /> Publish now
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </Shell>
  );
}
