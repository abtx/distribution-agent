import OpenAI from "openai";
import { replySchema } from "./schemas";
import type { Product, RedditPost } from "../types";

const requestedFields = [
  { key: "name", label: "Startup Name / URL", pattern: /startup\s+name\s*\/\s*url|product\s+name\s*\/\s*url|name\s*(?:and|\/)\s*(?:website|url|link)/i },
  { key: "location", label: "Location", pattern: /^location$/i },
  { key: "pitch", label: "Elevator pitch", pattern: /^(?:elevator\s+)?pitch$/i },
  { key: "details", label: "More details", pattern: /^(?:more\s+)?details$/i },
  { key: "goals", label: "Goals this month", pattern: /^goals?(?:\s+this\s+(?:month|quarter|week))?$/i },
  { key: "help", label: "How could the community help?", pattern: /^how\s+(?:could|can)\s+.+\s+help\??$/i },
  { key: "discount", label: "Community discount", pattern: /discount.*(?:subscriber|community|member)|(?:subscriber|community|member).*discount/i },
] as const;

function cleanHeading(line: string) {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^\*\*(.+)\*\*:?$/, "$1")
    .replace(/:$/, "")
    .trim();
}

export function detectRequestedReplyFields(body: string) {
  const found = new Map<string, { key: string; label: string; index: number }>();
  let offset = 0;
  for (const line of body.split(/\r?\n/)) {
    const heading = cleanHeading(line);
    if (heading.length > 0 && heading.length <= 100) {
      for (const field of requestedFields) {
        if (field.pattern.test(heading) && !found.has(field.key))
          found.set(field.key, { key: field.key, label: heading, index: offset });
      }
    }
    offset += line.length + 1;
  }
  return [...found.values()].sort((a, b) => a.index - b.index);
}

function noteValue(product: Product, names: string[]) {
  for (const line of product.notes.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match && names.some((name) => match[1].trim().toLowerCase() === name))
      return match[2].trim();
  }
  return null;
}

function fieldValue(key: string, product: Product) {
  const detail = product.description.trim() || product.one_liner;
  switch (key) {
    case "name":
      return `${product.name} / ${product.url}`;
    case "location":
      return noteValue(product, ["location"]) || "Online";
    case "pitch":
      return product.one_liner;
    case "details":
      return detail;
    case "goals":
      return noteValue(product, ["goals", "goals this month"]) || product.preferred_cta;
    case "help":
      return product.preferred_cta;
    case "discount":
      return noteValue(product, ["discount", "community discount"]) || "No community-specific discount right now.";
    default:
      return detail;
  }
}

function requiredCopy(product: Product) {
  return (product.must_include || "").trim().replaceAll("{url}", product.url);
}

function appendRequiredCopy(content: string, product: Product) {
  const required = requiredCopy(product);
  if (!required || content.includes(required)) return content;
  return `${content}\n\n${required}`;
}

function productPositioning(product: Product) {
  const firstParagraph = product.description
    .trim()
    .split(/\r?\n\s*\r?\n/, 1)[0]
    .replace(/\s+/g, " ");
  const positioning = firstParagraph || product.one_liner.trim();
  const repeatedName = new RegExp(`^${escapeRegExp(product.name)}\\s+is\\s+`, "i");
  const withoutRepeatedName = positioning.replace(repeatedName, "");
  return withoutRepeatedName.replace(/^./, (character) => character.toLowerCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function productBlock(product: Product) {
  const required = requiredCopy(product);
  const linkCopy = required.includes(product.url)
    ? required
    : [required, product.url].filter(Boolean).join("\n");
  return `• ${product.name} - ${productPositioning(product)}\n${linkCopy}`;
}

function normalizeDashes(reply: string) {
  return reply.replace(/\s*[—–]\s*/g, " - ");
}

function ensureRequiredContent(reply: string, products: Product[]) {
  const additions = products.flatMap((product) => {
    const missing = [requiredCopy(product), product.url].filter(
      (value) => value && !reply.includes(value),
    );
    return missing.length ? [`• ${product.name}\n${missing.join("\n")}`] : [];
  });
  return additions.length
    ? `${reply.trim()}\n\n${additions.join("\n\n")}`
    : reply;
}

function formattedFallback(post: RedditPost, products: Product[]) {
  const fields = detectRequestedReplyFields(post.body);
  if (fields.length < 2) return null;
  return products
    .map((product) =>
      appendRequiredCopy(
        fields
          .map((field) => `${field.label}\n${fieldValue(field.key, product)}`)
          .join("\n\n"),
        product,
      ),
    )
    .join("\n\n");
}

export async function generateReply(post: RedditPost, products: Product[]) {
  if (!products.length) throw new Error("At least one product is required");
  if (!process.env.OPENAI_API_KEY) {
    const formatted = formattedFallback(post, products);
    if (formatted) return normalizeDashes(formatted);
    const reply = products.length === 1
      ? `I’m building ${productBlock(products[0]).replace(/^• /, "")}`
      : `I’m building a couple of things:\n\n${products.map(productBlock).join("\n\n")}`;
    return normalizeDashes(reply);
  }
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 15000,
    maxRetries: 2,
  });
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Write one human social reply as JSON {reply}. The source post body is authoritative. Detect and strictly follow every requested reply field, heading, order, template, and formatting example. If a requested fact is unavailable, say so briefly rather than inventing it. Otherwise be short, contextual, factual, with no hashtags, fake claims, or hype. Mention being the builder and include every supplied product with its link. Include each product's non-empty must_include text exactly as written, replacing {url} with that product's URL. When there are multiple products, give each its own bullet and separate product blocks with exactly one empty line; never run one product's description or link into another product. Do not add a redundant summary or closing unless the source post asks for one. For X, lead with a useful response to the post and avoid sounding like an unsolicited pitch. Do not imply separate products are one product. Use ordinary hyphens (-), never em dashes or en dashes.",
      },
      { role: "user", content: JSON.stringify({ post, products }) },
    ],
  });
  return normalizeDashes(
    ensureRequiredContent(
      replySchema.parse(JSON.parse(r.choices[0]?.message.content || "{}"))
        .reply,
      products,
    ),
  );
}
