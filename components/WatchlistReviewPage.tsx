import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Inbox, LoaderCircle } from "lucide-react";
import Link, { useRouter } from "@/lib/navigation";
import type { DiscoverySource } from "@/lib/types";
import { Shell } from "./Shell";

const progressKey = "distribution-agent-watchlist-position";
function savedPosition() {
  try { return Number(window.localStorage?.getItem(progressKey) || 0); }
  catch { return 0; }
}
function savePosition(position: number) {
  try { window.localStorage?.setItem(progressKey, String(position)); }
  catch { /* Progress persistence is optional in restricted browser contexts. */ }
}

export function WatchlistReviewPage() {
  const router = useRouter();
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [position, setPosition] = useState(savedPosition);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sources").then(async (response) => {
      if (!response.ok) throw new Error("Could not load watchlist");
      const data = (await response.json() as DiscoverySource[]).filter((item) => item.channel === "reddit" && item.enabled);
      setSources(data);
      setPosition((current) => data.length ? Math.min(current, data.length - 1) : 0);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load watchlist"));
  }, []);

  const move = (next: number) => {
    if (!sources.length) return;
    const safe = (next + sources.length) % sources.length;
    setPosition(safe); savePosition(safe); setError("");
  };
  const resetForm = () => { setUrl(""); setTitle(""); setBody(""); setAuthor(""); };
  const importPost = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch("/api/opportunities/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, title, body, author }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(`${data.error || "Could not import post"}${data.reasoning ? ` - ${data.reasoning}` : ""}`); return; }
    resetForm(); router.push(`/opportunities/${data.id}`);
  };
  const current = sources[position];
  return <Shell>
    <header><div><p className="eyebrow">ASSISTED FALLBACK</p><h1>Review watchlist</h1><p className="muted">You browse Reddit normally. Distribution Agent handles everything after you choose a post.</p></div><Link className="secondary" href="/sources"><ArrowLeft size={15}/> Sources</Link></header>
    {!current ? <div className="panel review-empty"><b>No enabled Reddit communities</b><span>Add or enable communities in Sources before starting a review.</span><Link href="/sources">Open Sources</Link></div> : <div className="review-grid">
      <section className="panel community-review">
        <p className="eyebrow">COMMUNITY {position + 1} OF {sources.length}</p>
        <h2>r/{current.name}</h2><p className="muted">{current.reason}</p>
        <a className="primary review-open" href={`https://www.reddit.com/r/${encodeURIComponent(current.name)}/new/`} target="_blank" rel="noreferrer">Open newest posts <ExternalLink size={15}/></a>
        <p className="review-note">Look for a post that explicitly welcomes products, recommendations, launches, or feedback. Copy only a post you want Distribution Agent to evaluate.</p>
        <div className="review-nav"><button className="secondary" onClick={() => move(position - 1)}><ArrowLeft size={15}/> Previous</button><button className="secondary" onClick={() => move(position + 1)}>Next <ArrowRight size={15}/></button></div>
      </section>
      <form className="panel import-form" onSubmit={importPost}>
        <div><p className="eyebrow">CAPTURE A POST</p><h2>Send it to the review queue</h2><p className="muted">No page is fetched automatically. Paste the visible post details below.</p></div>
        {error && <div className="alert">{error}</div>}
        <label>Reddit post URL<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.reddit.com/r/.../comments/..."/></label>
        <label>Post title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Paste the exact title"/></label>
        <label>Post text<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Paste the post body or requested reply format"/></label>
        <label>Author (optional)<input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="username"/></label>
        <button className="primary" disabled={busy}>{busy ? <LoaderCircle className="spinner" size={16}/> : <Inbox size={16}/>} {busy ? "Analysing..." : "Analyse and add to queue"}</button>
      </form>
    </div>}
  </Shell>;
}
