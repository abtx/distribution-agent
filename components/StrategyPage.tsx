"use client";
import { useEffect, useState } from "react";
import { Braces, Check, FileText, Plus, Save } from "lucide-react";
import { Shell } from "./Shell";
import type { StrategyDocument } from "@/lib/types";
const starter = `# Marketing strategy\n\n## Positioning\nWhat problem does the product solve, and for whom?\n\n## Current goals\n- Goal 1\n- Goal 2\n\n## Core messages\n- Message 1\n\n## Channel approach\n### X\n\n### Reddit\n\n### Video\n\n## Guardrails\nWhat should the brand never do or say?`;
export function StrategyPage() {
  const [docs, setDocs] = useState<StrategyDocument[]>([]),
    [id, setId] = useState<string | null>(null),
    [name, setName] = useState("Core marketing strategy"),
    [content, setContent] = useState(starter),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  const select = (d: StrategyDocument) => {
    setId(d.id);
    setName(d.name);
    setContent(d.content);
    setSaved(false);
  };
  const load = () =>
    fetch("/api/strategy")
      .then((r) => r.json())
      .then((d: StrategyDocument[]) => {
        setDocs(d);
        if (d[0]) select(d[0]);
      });
  useEffect(() => {
    void load();
    // This page intentionally loads the most recent strategy only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fresh = () => {
    setId(null);
    setName("Untitled strategy");
    setContent(starter);
    setSaved(false);
  };
  const save = async () => {
    setSaving(true);
    setError("");
    const r = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id || undefined, name, content }),
      }),
      d = await r.json();
    setSaving(false);
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setId(d.id);
    setSaved(true);
    setDocs(await fetch("/api/strategy").then((x) => x.json()));
  };
  return (
    <Shell>
      <header>
        <div>
          <p className="eyebrow">STRATEGIC CONTEXT</p>
          <h1>Marketing strategy</h1>
          <p className="muted">
            One source of truth for campaigns and future AI integrations.
          </p>
        </div>
        <button className="primary" disabled={saving} onClick={save}>
          {saved ? <Check size={15} /> : <Save size={15} />}{" "}
          {saving ? "Saving…" : saved ? "Saved" : "Save strategy"}
        </button>
      </header>
      {error && <div className="alert">{error}</div>}
      <div className="strategygrid">
        <section className="panel strategydocs">
          <div className="strategytitle">
            <h2>Documents</h2>
            <button onClick={fresh} aria-label="New strategy">
              <Plus size={15} />
            </button>
          </div>
          {docs.length === 0 ? (
            <p className="muted">No saved strategy yet.</p>
          ) : (
            docs.map((d) => (
              <button
                className={id === d.id ? "chosen" : ""}
                onClick={() => select(d)}
                key={d.id}
              >
                <FileText size={16} />
                <span>
                  <b>{d.name}</b>
                  <small>{new Date(d.updated_at).toLocaleDateString()}</small>
                </span>
              </button>
            ))
          )}
        </section>
        <section className="panel strategyeditor">
          <label>
            Strategy name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label>
            Strategy and operating context
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <div className="contextapi">
            <Braces size={18} />
            <div>
              <b>Ready for an MCP bridge</b>
              <span>
                The latest strategy is exposed locally at{" "}
                <code>/api/strategy/context</code>, giving Codex, Claude, or
                another harness a stable context endpoint later.
              </span>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
