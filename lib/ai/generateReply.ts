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
  const prefix = (product.must_include || "").trim();
  if (!prefix) return product.url;
  if (prefix.includes("{url}")) return prefix.replaceAll("{url}", product.url);
  return `${prefix.replace(/:\s*$/, "")}: ${product.url}`;
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
  return `• ${product.name} - ${productPositioning(product)}\n${required}`;
}

function founderClosing(productCount: number) {
  return productCount === 1
    ? "Happy to share more about how I’m building it, and I’d genuinely appreciate any feedback."
    : "Happy to share more about how I’m building these, and I’d genuinely appreciate any feedback.";
}

function founderIntro(productCount: number) {
  return productCount === 1
    ? "I’m an indie founder working on this:"
    : "I’m an indie founder working on a couple of products:";
}

function normalizeDashes(reply: string) {
  return reply.replace(/\s*[—–]\s*/g, " - ");
}

function ensureRequiredContent(reply: string, products: Product[]) {
  const additions = products.flatMap((product) => {
    const missing = [requiredCopy(product)].filter(
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

function isProductInvitation(post: RedditPost) {
  return /(?:what (?:are|have) you build|what are you working on|share (?:your|what you)|drop (?:your|a) (?:product|startup|project|link)|showcase|post your|promote your|introduce your (?:product|startup|project))/i.test(
    `${post.title}\n${post.body}`,
  );
}

function xContextualReply(post: RedditPost) {
  const source = `${post.title}\n${post.body}`;
  if (/shareab|query param|url param|deep link|send (?:the|a) link/i.test(source))
    return "Making the exact view shareable through the URL is a smart bit of product design - it turns something people browse into something they can pass around.";
  if (/feedback|user test|beta test|early user/i.test(source))
    return "The focus on getting real feedback early makes a lot of sense. The best product lessons usually come from watching where people hesitate, not just what they say.";
  if (/launch|launched|shipping|shipped|just released/i.test(source))
    return "Congrats on shipping this. The practical product decisions behind a launch are always more useful to see than a polished announcement alone.";
  if (/pricing|revenue|mrr|arr|conversion|growth/i.test(source))
    return "This is a useful look at the trade-off. Sharing the practical numbers and the thinking behind them makes the lesson much clearer.";
  if (/airthings|air quality.*sensor|temperature sensor/i.test(source))
    return "That’s a useful setup - having temperature and air quality in one sensor makes it much easier to work out whether the room feels off or actually is.";
  if (/hotel.*(?:ac|air con)|(?:ac|air con).*hotel|temperature.*colder/i.test(source))
    return "That’s such a strange bit of interface design. If the room is warmer than the display suggests, it feels less like comfort control and more like expectation management.";
  return "That’s an interesting detail. Small, practical choices like this often reveal the most about how a product is meant to be used.";
}

function truncateAtWord(value: string, limit: number) {
  if (value.length <= limit) return value;
  const clipped = value.slice(0, Math.max(0, limit - 3));
  const boundary = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, boundary > limit * 0.6 ? boundary : undefined).trim()}...`;
}

function fitXReply(value: string, required = "") {
  let content = normalizeDashes(value).replace(/\n{3,}/g, "\n\n").trim();
  if (required) {
    content = content.replace(required, "").trim();
    const available = 280 - required.length - 2;
    return `${truncateAtWord(content, available)}\n\n${required}`;
  }
  return truncateAtWord(content, 280);
}

function xFallback(post: RedditPost, product: Product) {
  if (!isProductInvitation(post)) return fitXReply(xContextualReply(post));
  const required = requiredCopy(product);
  const reply = `Love seeing builders share what they’re working on. I’m building ${product.name} - ${productPositioning(product)} Happy to compare notes with other founders here.`;
  return fitXReply(reply, required);
}

export async function generateReply(post: RedditPost, products: Product[]) {
  if (!products.length) throw new Error("At least one product is required");
  const replyProducts = post.platform === "x" ? products.slice(0, 1) : products;
  if (!process.env.OPENAI_API_KEY) {
    if (post.platform === "x") return xFallback(post, replyProducts[0]);
    const formatted = formattedFallback(post, replyProducts);
    if (formatted) return normalizeDashes(formatted);
    const reply = `${founderIntro(replyProducts.length)}\n\n${replyProducts.map(productBlock).join("\n\n")}\n\n${founderClosing(replyProducts.length)}`;
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
          post.platform === "x"
            ? "Write one natural X reply as JSON {reply}, no more than 280 characters. Respond directly to the specific point, detail, or question in the source post. Sound like a thoughtful founder joining a conversation, not a marketing template. No hashtags, fake claims, generic praise, bullets, em dashes, or en dashes. Mention the one supplied product and include its link only when the source explicitly invites people to share products, startups, projects, or links. Otherwise do not mention or link the product. Ask a natural question only when it adds something useful. Use ordinary hyphens (-)."
            : "Write one human Reddit reply as JSON {reply}. The source post body is authoritative. Detect and strictly follow every requested reply field, heading, order, template, and formatting example. If a requested fact is unavailable, say so briefly rather than inventing it. Otherwise be short, contextual, factual, with no hashtags, fake claims, or hype. Include every supplied product with its link. For generic product-sharing posts, begin with one understated sentence introducing yourself as an indie founder and naturally leading into the products. Then output product bullets in the form '• NAME - concise positioning' followed on the next line by 'URL PREFIX: URL'. Treat each product's non-empty must_include value as its URL prefix. Legacy values containing {url} must be included exactly after replacing {url} with the product URL. Separate product blocks with exactly one empty line; never run one product's description or link into another product. Finish with one brief, warm founder sentence that offers to share what you have learned or how you are building the products and genuinely invites feedback. Sound thoughtful, helpful, and confident, never salesy or self-congratulatory. Do not add a redundant summary unless the source post asks for one. Do not imply separate products are one product. Use ordinary hyphens (-), never em dashes or en dashes.",
      },
      { role: "user", content: JSON.stringify({ post, products: replyProducts }) },
    ],
  });
  const reply = replySchema.parse(
    JSON.parse(r.choices[0]?.message.content || "{}"),
  ).reply;
  if (post.platform === "x")
    return fitXReply(
      reply,
      isProductInvitation(post) ? requiredCopy(replyProducts[0]) : "",
    );
  return normalizeDashes(ensureRequiredContent(reply, replyProducts));
}
