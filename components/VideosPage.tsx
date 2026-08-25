"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "@/lib/navigation";
import { FileVideo, Plus, Upload } from "lucide-react";
import { Shell } from "./Shell";
import { ChannelBadge } from "./ChannelBadge";
import type { ContentItem } from "@/lib/types";
type Asset = { name: string; url: string; uses: number };
export function VideosPage() {
  const [items, setItems] = useState<ContentItem[]>([]),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/content")
      .then((r) => r.json())
      .then(setItems);
  }, []);
  const assets = useMemo(() => {
    const map = new Map<string, Asset>();
    for (const item of items.filter(
      (x) => x.kind === "video" && x.asset_url && x.asset_name,
    )) {
      const prior = map.get(item.asset_url!);
      map.set(item.asset_url!, {
        name: item.asset_name!,
        url: item.asset_url!,
        uses: (prior?.uses || 0) + 1,
      });
    }
    return [...map.values()];
  }, [items]);
  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.set("video", file);
    const r = await fetch("/api/videos", { method: "POST", body: fd }),
      d = await r.json();
    setUploading(false);
    if (!r.ok) {
      setError(d.error);
      return;
    }
    location.href = `/content?asset=${encodeURIComponent(d.url)}&name=${encodeURIComponent(d.name)}`;
  };
  return (
    <Shell>
      <header>
        <div>
          <p className="eyebrow">ASSET LIBRARY</p>
          <h1>Videos</h1>
          <p className="muted">
            Keep reusable source videos local and turn them into multi-channel
            batches.
          </p>
        </div>
        <label className="primary uploadbutton">
          <Upload size={15} />
          {uploading ? "Uploading…" : "Upload video"}
          <input
            aria-label="Upload library video"
            type="file"
            accept="video/*"
            disabled={uploading}
            onChange={(e) =>
              e.target.files?.[0] && void upload(e.target.files[0])
            }
          />
        </label>
      </header>
      {error && <div className="alert">{error}</div>}
      <section className="videoassets">
        {assets.length === 0 ? (
          <div className="panel empty">
            <FileVideo size={28} />
            <b>No batched videos yet</b>
            <span>
              Select a source video while creating your first video batch.
            </span>
            <Link className="primary" href="/content">
              <Plus size={15} /> Create video batch
            </Link>
          </div>
        ) : (
          assets.map((asset) => (
            <article className="panel videoasset" key={asset.url}>
              <video controls preload="metadata" src={asset.url} />
              <div>
                <h2>{asset.name}</h2>
                <p className="muted">
                  Used in {asset.uses} batch{asset.uses === 1 ? "" : "es"}
                </p>
                <Link
                  className="primary"
                  href={`/content?asset=${encodeURIComponent(asset.url)}&name=${encodeURIComponent(asset.name)}`}
                >
                  <Plus size={15} /> New video batch
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
      <section className="panel history">
        <p className="eyebrow">VIDEO BATCHES</p>
        <h2>Distribution history</h2>
        {items.filter((x) => x.kind === "video").length === 0 ? (
          <p className="muted">No video batches yet.</p>
        ) : (
          items
            .filter((x) => x.kind === "video")
            .map((item) => (
              <div className="historyrow" key={item.id}>
                <div>
                  <b>{item.title}</b>
                  <span>{item.asset_name}</span>
                </div>
                <div className="channelrow">
                  {item.channels.map((c) => (
                    <ChannelBadge key={c} channel={c} />
                  ))}
                </div>
                <span className={`chip ${item.status}`}>{item.status}</span>
              </div>
            ))
        )}
      </section>
    </Shell>
  );
}
