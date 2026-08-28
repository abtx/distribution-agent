"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "@/lib/navigation";
import { useRouter } from "@/lib/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";
import type { Opportunity, Product } from "@/lib/types";
import { showToast } from "@/lib/toast";
import { Shell } from "./Shell";
export function OpportunityDetail({
  initial,
  products: suppliedProducts,
  product,
  previousId = null,
  nextId = null,
  position,
  total,
}: {
  initial: Opportunity;
  products?: Product[];
  product?: Product;
  previousId?: string | null;
  nextId?: string | null;
  position?: number;
  total?: number;
}) {
  const router = useRouter();
  const products = suppliedProducts || (product ? [product] : []);
  const [op, setOp] = useState(initial),
    [text, setText] = useState(initial.edited_reply || initial.proposed_reply),
    [saving, setSaving] = useState(false),
    [publishing, setPublishing] = useState(false),
    [confirmingPublish, setConfirmingPublish] = useState(false),
    [publishError, setPublishError] = useState(""),
    [message, setMessage] = useState(""),
    [selectedProductIds, setSelectedProductIds] = useState(
      initial.matched_product_ids || [initial.matched_product_id],
    );
  const published = opMetadataPublished(op);
  const update = useCallback(async (patch: Partial<Opportunity>) => {
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
      return true;
    }
    setMessage(d.error || "Could not save");
    return false;
  }, [op.id]);
  const reject = useCallback(
    async () => {
      if (saving || publishing || op.status !== "pending") return;
      const saved = await update({ status: "rejected" });
      if (!saved) return;
      const destination = nextId || previousId;
      router.push(destination ? `/opportunities/${destination}` : "/");
    },
    [nextId, op.status, previousId, publishing, router, saving, update],
  );
  const requestPublish = useCallback(() => {
    if (saving || publishing || op.status !== "pending") return;
    setPublishError("");
    setConfirmingPublish(true);
  }, [op.status, publishing, saving]);
  const confirmPublish = useCallback(async () => {
    if (saving || publishing || op.status !== "pending") return;
    setConfirmingPublish(false);
    setPublishing(true);
    setPublishError("");
    setMessage("");
    try {
      const response = await fetch(`/api/opportunities/${op.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Could not reply to post");
      setOp(data);
      setMessage("Reply posted");
      const receipt = opMetadataPublished(data);
      showToast({
        title: "Reply posted successfully",
        message: `Comment ID: ${receipt?.id || "Provider did not return an ID"}`,
        url: receipt?.url,
      });
      router.push(nextId ? `/opportunities/${nextId}` : "/");
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Could not reply to post",
      );
    } finally {
      setPublishing(false);
    }
  }, [nextId, op.id, op.status, publishing, router, saving, text]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.isContentEditable ||
        target?.matches("input, textarea, select, button, a")
      )
        return;
      const destination =
        event.key === "ArrowLeft"
          ? previousId
          : event.key === "ArrowRight"
            ? nextId
            : null;
      if (destination) {
        event.preventDefault();
        router.push(`/opportunities/${destination}`);
        return;
      }
      if (event.key === "Enter" || event.key === "Backspace") {
        event.preventDefault();
        if (event.key === "Enter") {
          if (confirmingPublish) void confirmPublish();
          else requestPublish();
        }
        else void reject();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [confirmPublish, confirmingPublish, nextId, previousId, reject, requestPublish, router]);
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
  const copyReply = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard");
    } catch {
      setMessage("Could not copy to clipboard");
    }
  };
  return (
    <Shell>
      {(confirmingPublish || publishing || publishError || op.status === "posted") && (
        <aside
          className={`publish-notice ${publishError ? "error" : op.status === "posted" ? "success" : ""}`}
          role={publishError ? "alert" : "status"}
          aria-live="polite"
        >
          {confirmingPublish ? (
            <>
              <b>Post this public reply?</b>
              <span>It will be published through Zernio as your connected account.</span>
              <div>
                <button type="button" onClick={() => setConfirmingPublish(false)}>
                  Cancel
                </button>
                <button className="primary" type="button" onClick={() => void confirmPublish()}>
                  Confirm reply
                </button>
              </div>
            </>
          ) : publishing ? (
            <>
              <b><LoaderCircle className="spinner" size={16} /> Posting reply</b>
              <span>Waiting for confirmation from the platform...</span>
            </>
          ) : publishError ? (
            <>
              <b>Reply was not posted</b>
              <span>{publishError}</span>
              <button type="button" onClick={() => setPublishError("")}>Dismiss</button>
            </>
          ) : (
            <>
              <b>Reply posted successfully</b>
              <span>Comment ID: {published?.id || "Provider did not return an ID"}</span>
              {published?.url && (
                <a href={published.url} target="_blank" rel="noreferrer">
                  View reply <ExternalLink size={13} />
                </a>
              )}
            </>
          )}
        </aside>
      )}
      <header>
        <div>
          <Link className="back" href="/">
            <ArrowLeft size={15} /> All opportunities
          </Link>
          <h1>Review opportunity</h1>
          <nav className="review-nav" aria-label="Opportunity navigation">
            {previousId ? (
              <Link href={`/opportunities/${previousId}`} aria-label="Previous opportunity">
                <ChevronLeft size={15} /> Previous
              </Link>
            ) : (
              <span aria-disabled="true">
                <ChevronLeft size={15} /> Previous
              </span>
            )}
            {position && total ? (
              <small>
                {position} of {total}
              </small>
            ) : null}
            {nextId ? (
              <Link href={`/opportunities/${nextId}`} aria-label="Next opportunity">
                Next <ChevronRight size={15} />
              </Link>
            ) : (
              <span aria-disabled="true">
                Next <ChevronRight size={15} />
              </span>
            )}
          </nav>
        </div>
        <div className="actions">
          <button
            className="danger"
            disabled={saving || publishing || op.status === "posted"}
            title="Reject and open the next pending opportunity (Backspace)"
            onClick={() => void reject()}
          >
            <X size={16} /> Reject <kbd aria-hidden="true">⌫</kbd>
          </button>
          <button
            className="approve"
            disabled={saving || publishing || op.status === "posted"}
            title="Publish this reply and open the next pending opportunity (Enter)"
            onClick={requestPublish}
          >
            {publishing ? <LoaderCircle className="spinner" size={16} /> : <ExternalLink size={16} />}
            {op.status === "posted" ? "Replied" : publishing ? "Posting reply..." : "Reply to post"}{" "}
            {op.status !== "posted" && !publishing && <kbd aria-hidden="true">↵</kbd>}
          </button>
        </div>
      </header>
      <div className="detailgrid">
        <section className="card">
          <p className="eyebrow">ORIGINAL POST</p>
          <div className="meta">
            {op.source === "x_api" ? `${op.subreddit} · @${op.author}` : `r/${op.subreddit} · u/${op.author}`}
          </div>
          <h2>{op.post_title}</h2>
          <p className="postbody">{op.post_body || "No post body provided."}</p>
          <a
            className="out"
            href={op.post_url}
            target="_blank"
            rel="noreferrer"
          >
            Open {op.source === "x_api" ? "X" : "Reddit"} post <ExternalLink size={14} />
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
                  .join(", ") || "-"}
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
            <div className="reply-tools">
              <button
                type="button"
                disabled={saving || publishing || selectedProductIds.length === 0}
                onClick={regenerate}
              >
                <RefreshCw size={14} /> Generate combined reply
              </button>
              <button
                className="copy-primary"
                type="button"
                onClick={copyReply}
              >
                <Copy size={14} /> Copy reply
              </button>
            </div>
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
            <div className="editor-actions">
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
          </div>
          <div className="notice">
            Reply to post publishes the text through Zernio after confirmation.
            A successful reply moves this opportunity to the Replied list.
          </div>
        </section>
      </div>
    </Shell>
  );
}

function opMetadataPublished(opportunity: Opportunity) {
  const value = opportunity.metadata?.published;
  if (!value || typeof value !== "object") return null;
  const id = "id" in value && typeof value.id === "string" ? value.id : null;
  const storedUrl = "url" in value && typeof value.url === "string" ? value.url : null;
  const url = storedUrl || (id
    ? opportunity.source === "x_api"
      ? `https://x.com/i/web/status/${id}`
      : `${opportunity.post_url.replace(/\/$/, "")}/comment/${id}/`
    : null);
  return { id, url };
}
