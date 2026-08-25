"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, RefreshCw, X } from "lucide-react";
import type { Opportunity, Product } from "@/lib/types";
import { Shell } from "./Shell";
export function OpportunityDetail({
  initial,
  products: suppliedProducts,
  product,
}: {
  initial: Opportunity;
  products?: Product[];
  product?: Product;
}) {
  const products = suppliedProducts || (product ? [product] : []);
  const [op, setOp] = useState(initial),
    [text, setText] = useState(initial.edited_reply || initial.proposed_reply),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [selectedProductIds, setSelectedProductIds] = useState(
      initial.matched_product_ids || [initial.matched_product_id],
    );
  const update = async (patch: Partial<Opportunity>) => {
    setSaving(true);
    setMessage("");
    const r = await fetch(`/api/opportunities/${op.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) {
      setOp(d);
      setMessage("Saved");
    } else setMessage(d.error || "Could not save");
  };
  const regenerate = async () => {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/opportunities/${op.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: selectedProductIds }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok)
      return setMessage(data.error || "Could not generate reply");
    setOp(data);
    setText(data.proposed_reply);
    setMessage("Combined reply generated");
  };
  const publish = async () => {
    if (
      !window.confirm("Post this reply to Reddit now? This action is public.")
    )
      return;
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/opportunities/${op.id}/publish`, {
      method: "POST",
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok)
      return setMessage(data.error || "Could not publish reply");
    setOp(data);
    setMessage("Posted to Reddit");
  };
  return (
    <Shell>
      <header>
        <div>
          <Link className="back" href="/">
            <ArrowLeft size={15} /> All opportunities
          </Link>
          <h1>Review opportunity</h1>
        </div>
        <div className="actions">
          <button
            className="danger"
            disabled={saving}
            onClick={() => update({ status: "rejected" })}
          >
            <X size={16} /> Reject
          </button>
          <button
            className="approve"
            disabled={saving}
            onClick={() => update({ status: "approved", edited_reply: text })}
          >
            <Check size={16} /> Approve
          </button>
          {op.status === "approved" && (
            <button className="primary" disabled={saving} onClick={publish}>
              <ExternalLink size={16} /> Post to Reddit
            </button>
          )}
        </div>
      </header>
      <div className="detailgrid">
        <section className="card">
          <p className="eyebrow">ORIGINAL POST</p>
          <div className="meta">
            r/{op.subreddit} · u/{op.author}
          </div>
          <h2>{op.post_title}</h2>
          <p className="postbody">{op.post_body || "No post body provided."}</p>
          <a
            className="out"
            href={op.post_url}
            target="_blank"
            rel="noreferrer"
          >
            Open Reddit post <ExternalLink size={14} />
          </a>
        </section>
        <section className="card analysis">
          <p className="eyebrow">ANALYSIS</p>
          <div className="scorebig">
            {op.score}
            <span>/100</span>
          </div>
          <dl>
            <div>
              <dt>Promotion allowed</dt>
              <dd>{op.promotion_allowed ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Matched products</dt>
              <dd>
                {(op.matched_product_ids || [op.matched_product_id])
                  .map(
                    (id) => products.find((product) => product.id === id)?.name,
                  )
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt>Product match</dt>
              <dd>{op.match_score}%</dd>
            </div>
          </dl>
          <p>{op.reasoning}</p>
        </section>
        <section className="card editor">
          <p className="eyebrow">PROPOSED REPLY</p>
          <fieldset className="product-picker">
            <legend>Include products</legend>
            {products
              .filter(
                (product) =>
                  product.status === "active" ||
                  selectedProductIds.includes(product.id),
              )
              .map((product) => (
                <label key={product.id}>
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={(event) =>
                      setSelectedProductIds((current) =>
                        event.target.checked
                          ? [...current, product.id]
                          : current.filter((id) => id !== product.id),
                      )
                    }
                  />
                  {product.name}
                </label>
              ))}
            <button
              type="button"
              disabled={saving || selectedProductIds.length === 0}
              onClick={regenerate}
            >
              <RefreshCw size={14} /> Generate combined reply
            </button>
          </fieldset>
          <textarea
            aria-label="Proposed reply"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="editorfoot">
            <span>
              {text.length} characters {message && `· ${message}`}
            </span>
            <button
              disabled={
                saving ||
                text === op.edited_reply ||
                (!op.edited_reply && text === op.proposed_reply)
              }
              onClick={() => update({ edited_reply: text })}
            >
              Save edit
            </button>
          </div>
          <div className="notice">
            Approval does not publish. Once approved, use “Post to Reddit” and
            confirm the public action.
          </div>
        </section>
      </div>
    </Shell>
  );
}
