import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Plus, Radar, Trash2 } from "lucide-react";
import { Shell } from "./Shell";
import type { DiscoveryChannel, DiscoverySource, SourceSuggestion } from "@/lib/types";

export function SourcesPage() {
  const [channel, setChannel] = useState<DiscoveryChannel>("reddit");
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [suggestions, setSuggestions] = useState<SourceSuggestion[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState("");
  const visible = useMemo(() => sources.filter((item) => item.channel === channel), [sources, channel]);

  useEffect(() => {
    fetch("/api/sources").then(async (response) => {
      if (!response.ok) throw new Error("Could not load discovery sources");
      setSources(await response.json());
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load sources"))
      .finally(() => setLoading(false));
  }, []);

  async function addSource(sourceName: string, reason = "Added manually") {
    setError("");
    const response = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, name: sourceName, reason }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not add source");
    setSources((current) => current.some((item) => item.id === data.id) ? current : [...current, data]);
    setSuggestions((current) => current.filter((item) => item.name.toLowerCase() !== data.name.toLowerCase()));
    setName("");
  }

  async function discover() {
    setDiscovering(true); setError(""); setSuggestions([]);
    try {
      const response = await fetch("/api/sources/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not suggest sources");
      setSuggestions(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not suggest sources"); }
    finally { setDiscovering(false); }
  }

  async function toggle(source: DiscoverySource) {
    const response = await fetch(`/api/sources/${source.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !source.enabled }) });
    if (!response.ok) return setError("Could not update source");
    setSources((current) => current.map((item) => item.id === source.id ? { ...item, enabled: !item.enabled } : item));
  }

  async function remove(source: DiscoverySource) {
    const response = await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
    if (!response.ok) return setError("Could not remove source");
    setSources((current) => current.filter((item) => item.id !== source.id));
  }

  return <Shell>
    <header><div><p className="eyebrow">DISCOVERY SETTINGS</p><h1>Sources</h1><p className="muted">Choose where Distribution Agent looks for useful conversations.</p></div></header>
    <div className="source-tabs" role="tablist">
      <button className={channel === "reddit" ? "active" : ""} onClick={() => { setChannel("reddit"); setSuggestions([]); }}>Reddit communities</button>
      <button className={channel === "x" ? "active" : ""} onClick={() => { setChannel("x"); setSuggestions([]); }}>X accounts</button>
    </div>
    {error && <p className="state error">{error}</p>}
    <section className="source-panel">
      <div className="source-panel-heading"><div><h2>{channel === "reddit" ? "Subreddits to watch" : "Accounts to watch"}</h2><p className="muted">{channel === "reddit" ? "Discovery searches recent posts inside enabled communities." : "Discovery checks recent original posts from enabled accounts."}</p></div><button className="primary" disabled={discovering} onClick={discover}>{discovering ? <LoaderCircle className="spinner" size={16}/> : <Radar size={16}/>} Suggest relevant {channel === "reddit" ? "subreddits" : "accounts"}</button></div>
      <form className="source-add" onSubmit={(event) => { event.preventDefault(); void addSource(name).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not add source")); }}>
        <span>{channel === "reddit" ? "r/" : "@"}</span><input aria-label={channel === "reddit" ? "Subreddit name" : "X account"} value={name} onChange={(event) => setName(event.target.value)} placeholder={channel === "reddit" ? "languagelearning" : "levelsio"}/><button disabled={!name.trim()}><Plus size={15}/> Add</button>
      </form>
      {loading ? <p className="state">Loading sources...</p> : visible.length ? <div className="source-list">{visible.map((source) => <article className={!source.enabled ? "disabled" : ""} key={source.id}><button className="source-toggle" aria-label={`${source.enabled ? "Disable" : "Enable"} ${source.name}`} onClick={() => void toggle(source)}><span>{source.enabled && <Check size={13}/>}</span></button><div><b>{channel === "reddit" ? "r/" : "@"}{source.name}</b><p>{source.reason}</p></div><button className="icon-button" aria-label={`Remove ${source.name}`} onClick={() => void remove(source)}><Trash2 size={15}/></button></article>)}</div> : <div className="source-empty"><b>No {channel === "reddit" ? "subreddits" : "accounts"} selected</b><span>Add one manually or ask for suggestions.</span></div>}
    </section>
    {(discovering || suggestions.length > 0) && <section className="suggestions"><div><p className="eyebrow">MINI DISCOVERY</p><h2>Suggested for your products</h2><p className="muted">Review each suggestion before adding it to the main discovery watchlist.</p></div>{discovering ? <div className="suggestion-loading"><LoaderCircle className="spinner" size={20}/><span>Matching your active products to relevant {channel === "reddit" ? "communities" : "accounts"}...</span></div> : <div className="suggestion-grid">{suggestions.map((item) => <article key={item.name}><div><span>{item.relevance}% match</span><h3>{channel === "reddit" ? "r/" : "@"}{item.name}</h3><p>{item.reason}</p></div><button onClick={() => void addSource(item.name, item.reason).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not add suggestion"))}><Plus size={15}/> Add to watchlist</button></article>)}</div>}</section>}
  </Shell>;
}
