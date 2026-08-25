import type { Opportunity, Product } from "./types";
const now = new Date().toISOString();
export const seedProducts: Product[] = [
  {
    id: "reelblocks",
    name: "ReelBlocks",
    url: "https://example.com/reelblocks",
    description:
      "Desktop video editor based around a visual canvas and block model rather than a conventional timeline.",
    one_liner: "A visual block-based desktop video editor.",
    categories: ["video editing", "creator tools", "desktop app"],
    audiences: ["creators", "YouTubers", "indie hackers"],
    keywords: ["video editor", "creator software", "editing"],
    status: "active",
    preferred_cta: "Looking for early users and honest feedback",
    notes: "Early beta",
    created_at: now,
    updated_at: now,
  },
  {
    id: "fluentish",
    name: "Fluentish",
    url: "https://example.com/fluentish",
    description:
      "An AI-assisted language-learning application for deliberate daily practice.",
    one_liner: "AI-assisted language practice that adapts to you.",
    categories: ["education", "language learning", "AI"],
    audiences: [
      "language learners",
      "people studying languages",
      "AI education users",
    ],
    keywords: ["language learning", "vocabulary", "speaking practice"],
    status: "active",
    preferred_cta: "Looking for learners to try it and share feedback",
    notes: "",
    created_at: now,
    updated_at: now,
  },
];
export const seedOpportunities: Opportunity[] = [
  {
    id: "demo-opportunity",
    reddit_post_id: "demo-001",
    subreddit: "SideProject",
    post_title: "What are you building this week? Share your side project",
    post_body: "Drop a link and tell us who it is for. Feedback welcome.",
    post_url:
      "https://www.reddit.com/r/SideProject/comments/1u70r9c/what_are_you_building_this_week_drop_your_project/",
    author: "community_builder",
    created_utc: new Date(Date.now() - 2 * 3600000).toISOString(),
    discovered_at: now,
    score: 91,
    reasoning:
      "The author explicitly asks builders to share a link and describe their product. ReelBlocks is a strong fit for this maker-focused thread.",
    promotion_allowed: true,
    matched_product_id: "reelblocks",
    matched_product_ids: ["reelblocks", "fluentish"],
    product_matches: [
      { productId: "reelblocks", score: 88 },
      { productId: "fluentish", score: 78 },
    ],
    match_score: 88,
    proposed_reply:
      "I’m building a couple of things:\n\n• ReelBlocks - a desktop video editor built around a visual canvas. https://example.com/reelblocks\n• Fluentish - a language-learning tool for practical speaking practice. https://example.com/fluentish\n\nI’d love to hear which one is most useful to you.",
    edited_reply: null,
    status: "pending",
    source: "mock",
    metadata: { confidence: 0.96 },
    created_at: now,
    updated_at: now,
  },
];
