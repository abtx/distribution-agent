"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileVideo, Pencil, Plus, Save, Send, X } from "lucide-react";
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
function localDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
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
    [error, setError] = useState(""),
    [editing, setEditing] = useState<ContentItem | null>(null);
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
  const startEditing = (item: ContentItem) => setEditing({
    ...item,
    channels: [...item.channels],
    targets: [...item.targets],
  });
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const scheduledAt = editing.scheduled_at;
    if (scheduledAt && !window.confirm(`Save and schedule this content for ${new Date(scheduledAt).toLocaleString()}?`)) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/content/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editing.title,
        body: editing.body,
        channels: editing.channels,
        targets: editing.targets,
        scheduled_at: scheduledAt,
        status: scheduledAt ? "scheduled" : "draft",
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error || "Could not save content");
    setEditing(null);
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
            items.map((item) => editing?.id === item.id ? (
              <form className="queue-edit" key={item.id} onSubmit={saveEdit}>
                <div className="queue-edit-heading"><b>Edit content</b><button type="button" aria-label="Cancel editing" onClick={() => setEditing(null)}><X size={16}/></button></div>
                <label>Internal title<input required value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })}/></label>
                <label>{editing.kind === "post" ? "Post copy" : "Caption"}<textarea required aria-label="Edit post copy" value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })}/></label>
                <fieldset><legend>Channels</legend><div className="channelchoices">{(editing.kind === "post" ? textChannels : videoChannels).map((channel) => <label className={editing.channels.includes(channel) ? "on" : ""} key={channel}><input type="checkbox" checked={editing.channels.includes(channel)} onChange={() => setEditing({ ...editing, channels: editing.channels.includes(channel) ? editing.channels.filter((item) => item !== channel) : [...editing.channels, channel] })}/><ChannelBadge channel={channel}/></label>)}</div></fieldset>
                <label>{editing.kind === "post" ? "People, communities or groups" : "Campaign tags"}<input value={editing.targets.join(", ")} onChange={(event) => setEditing({ ...editing, targets: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })}/></label>
                <label>Schedule (optional)<input type="datetime-local" value={localDateTimeValue(editing.scheduled_at)} onChange={(event) => setEditing({ ...editing, scheduled_at: event.target.value ? new Date(event.target.value).toISOString() : null })}/></label>
                <div className="queue-edit-actions"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button><button className="primary" disabled={busy || editing.channels.length === 0}><Save size={15}/> {busy ? "Saving..." : "Save changes"}</button></div>
              </form>
            ) : (
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
                    <div className="queue-actions">
                      <button className="secondary" disabled={busy} onClick={() => startEditing(item)}><Pencil size={13}/> Edit</button>
                      <button className="secondary" disabled={busy} onClick={() => publish(item)}><Send size={13} /> Publish now</button>
                    </div>
                  )}
                  {item.kind === "video" && item.status !== "published" && <button className="secondary" disabled={busy} onClick={() => startEditing(item)}><Pencil size={13}/> Edit</button>}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </Shell>
  );
}
