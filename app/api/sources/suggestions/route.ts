import { NextResponse } from "@/lib/http";
import { marketingStore } from "@/lib/marketingStore";
import { repository } from "@/lib/repository";
import type { SourceSuggestion } from "@/lib/types";

const reddit = [
  ["SideProject", "Weekly build and product showcase threads"],
  ["SaaS", "SaaS founders, feedback requests, and growth discussions"],
  ["startups", "Startup showcase and founder discussion threads"],
  ["indiehackers", "Independent makers sharing products and launch lessons"],
  ["EntrepreneurRideAlong", "Transparent founder journeys and product progress"],
  ["languagelearning", "Language learners who can give direct product feedback"],
  ["Language_Exchange", "People actively practising languages with others"],
];
const x = [
  ["levelsio", "Bootstrapped product launches and transparent marketing"],
  ["marc_louvion", "Solo-founder launches and distribution experiments"],
  ["dagorenouf", "Founder-led marketing and maker community conversations"],
  ["arvidkahl", "Bootstrapping, audiences, and sustainable product growth"],
  ["simonhoiberg", "SaaS building and founder marketing"],
  ["thisiskp_", "Build-in-public launches and product storytelling"],
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { channel?: string };
  if (body.channel !== "reddit" && body.channel !== "x")
    return NextResponse.json({ error: "Choose Reddit or X" }, { status: 400 });
  const [products, existing] = await Promise.all([repository.products(), marketingStore.discoverySources()]);
  const productText = products.filter((item) => item.status === "active")
    .flatMap((item) => [item.name, item.description, ...item.categories, ...item.audiences, ...item.keywords])
    .join(" ").toLowerCase();
  const candidates = body.channel === "reddit" ? reddit : x;
  const suggestions: SourceSuggestion[] = candidates
    .filter(([name]) => !existing.some((item) => item.channel === body.channel && item.name.toLowerCase() === name.toLowerCase()))
    .map(([name, reason], index) => ({
      channel: body.channel as "reddit" | "x",
      name,
      reason,
      relevance: Math.max(72, 96 - index * 4 + (/language|fluent|learn/.test(productText) && /language/i.test(name) ? 8 : 0)),
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 6);
  return NextResponse.json(suggestions);
}
