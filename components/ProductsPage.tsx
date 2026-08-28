"use client";
import { useEffect, useState } from "react";
import { Plus, RefreshCw, Save } from "lucide-react";
import type { Product, ProductStatus } from "@/lib/types";
import { Shell } from "./Shell";
const blank = {
  name: "",
  url: "",
  description: "",
  one_liner: "",
  categories: "",
  audiences: "",
  keywords: "",
  status: "active" as ProductStatus,
  preferred_cta: "",
  must_include: "",
  notes: "",
};
export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]),
    [form, setForm] = useState(blank),
    [editing, setEditing] = useState<string | null>(null),
    [regenerating, setRegenerating] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const load = () =>
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);
  useEffect(() => {
    void load();
  }, []);
  const edit = (p: Product) => {
    setEditing(p.id);
    setForm({
      ...p,
      must_include: p.must_include || "",
      categories: p.categories.join(", "),
      audiences: p.audiences.join(", "),
      keywords: p.keywords.join(", "),
    });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const body = {
      ...form,
      categories: form.categories
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      audiences: form.audiences
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      keywords: form.keywords
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };
    const r = await fetch(
      editing ? `/api/products/${editing}` : "/api/products",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) {
      const d = await r.json();
      setError(d.error);
      return;
    }
    const result = await r.json();
    if (editing) {
      if (result.regeneration_error)
        setError(`Product saved, but regeneration failed: ${result.regeneration_error}`);
      else if (result.regeneration)
        setMessage(
          `Product saved. Regenerated ${result.regeneration.regenerated} opportunities${result.regeneration.expired ? `; ${result.regeneration.expired} no longer matched` : ""}.`,
        );
    }
    setEditing(null);
    setForm(blank);
    await load();
  };
  const regenerate = async () => {
    setRegenerating(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/opportunities/regenerate", {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Regeneration failed");
      setMessage(
        `Regenerated ${result.regenerated} opportunities${result.expired ? `; ${result.expired} no longer matched` : ""}.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };
  return (
    <Shell>
      <header>
        <div>
          <p className="eyebrow">CATALOG</p>
          <h1>Products</h1>
          <p className="muted">
            Only active products are considered during discovery.
          </p>
        </div>
        <button
          className="secondary"
          type="button"
          disabled={regenerating}
          onClick={regenerate}
        >
          <RefreshCw size={15} />
          {regenerating ? "Regenerating…" : "Regenerate opportunities"}
        </button>
      </header>
      {message && <div className="success">{message}</div>}
      <div className="productsgrid">
        <section className="panel productlist">
          <h2>{products.length} products</h2>
          {products.map((p) => (
            <button
              className={`productrow ${editing === p.id ? "chosen" : ""}`}
              key={p.id}
              onClick={() => edit(p)}
            >
              <span className="avatar">{p.name[0]}</span>
              <span>
                <b>{p.name}</b>
                <small>{p.one_liner}</small>
              </span>
              <span className={`chip ${p.status}`}>{p.status}</span>
            </button>
          ))}
        </section>
        <form className="panel form" onSubmit={submit}>
          <div className="formtitle">
            <h2>{editing ? "Edit product" : "Add product"}</h2>
            {editing && (
              <button
                type="button"
                className="linkbutton"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                }}
              >
                <Plus size={14} /> New
              </button>
            )}
          </div>
          {error && <div className="alert">{error}</div>}
          <Field
            label="Name"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
          />
          <div className="twocol url-fields">
            <Field
              label="URL"
              value={form.url}
              onChange={(url) => setForm({ ...form, url })}
              type="url"
            />
            <Field
              label="URL prefix"
              value={form.must_include}
              onChange={(must_include) => setForm({ ...form, must_include })}
              placeholder="For example: FREE download"
            />
          </div>
          <Field
            label="One-line positioning"
            value={form.one_liner}
            onChange={(one_liner) => setForm({ ...form, one_liner })}
          />
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <div className="twocol">
            <Field
              label="Categories (comma-separated)"
              value={form.categories}
              onChange={(categories) => setForm({ ...form, categories })}
            />
            <Field
              label="Audiences (comma-separated)"
              value={form.audiences}
              onChange={(audiences) => setForm({ ...form, audiences })}
            />
          </div>
          <Field
            label="Keywords (comma-separated)"
            value={form.keywords}
            onChange={(keywords) => setForm({ ...form, keywords })}
          />
          <Field
            label="Preferred CTA"
            value={form.preferred_cta}
            onChange={(preferred_cta) => setForm({ ...form, preferred_cta })}
          />
          <div className="twocol">
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProductStatus })
                }
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <Field
              label="Notes"
              value={form.notes}
              onChange={(notes) => setForm({ ...form, notes })}
            />
          </div>
          <button className="primary" type="submit">
            <Save size={15} />
            {editing ? "Save changes" : "Add product"}
          </button>
        </form>
      </div>
    </Shell>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (x: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label>
      {label}
      <input
        required={label === "Name" || label === "URL"}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
