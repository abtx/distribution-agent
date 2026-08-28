export type ProductStatus = "active" | "disabled" | "archived";
export interface Product {
  id: string;
  name: string;
  url: string;
  description: string;
  one_liner: string;
  categories: string[];
  audiences: string[];
  keywords: string[];
  status: ProductStatus;
  preferred_cta: string;
  must_include: string;
  notes: string;
  created_at: string;
  updated_at: string;
}
export type OpportunityStatus =
  "pending" | "approved" | "rejected" | "posted" | "expired";
export interface Opportunity {
  id: string;
  reddit_post_id: string;
  subreddit: string;
  post_title: string;
  post_body: string;
  post_url: string;
  author: string;
  created_utc: string;
  discovered_at: string;
  score: number;
  reasoning: string;
  promotion_allowed: boolean;
  matched_product_id: string;
  matched_product_ids: string[];
  product_matches: ProductMatch[];
  match_score: number;
  proposed_reply: string;
  edited_reply: string | null;
  status: OpportunityStatus;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
export interface ProductMatch {
  productId: string;
  score: number;
}
export interface DiscoveryRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "failed";
  candidates_found: number;
  opportunities_created: number;
  error: string | null;
  metadata: Record<string, unknown>;
}
export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  url: string;
  author: string;
  createdUtc: string;
  score?: number;
  comments?: number;
  platform?: "reddit" | "x";
}
export type DiscoveryChannel = "reddit" | "x";
export interface DiscoverySource {
  id: string;
  channel: DiscoveryChannel;
  name: string;
  enabled: boolean;
  reason: string;
  created_at: string;
}
export interface SourceSuggestion {
  channel: DiscoveryChannel;
  name: string;
  reason: string;
  relevance: number;
}
export interface Classification {
  isPromotionOpportunity: boolean;
  promotionExplicitlyAllowed: boolean;
  confidence: number;
  opportunityScore: number;
  reasoning: string;
  bestProductId: string | null;
  productMatchScore: number;
  productMatches: ProductMatch[];
}
export type MarketingChannel =
  "x" | "reddit" | "youtube" | "tiktok" | "instagram" | "linkedin";
export type ContentStatus =
  "draft" | "scheduled" | "queued" | "published" | "failed";
export interface ContentItem {
  id: string;
  kind: "post" | "video";
  title: string;
  body: string;
  product_id: string | null;
  channels: MarketingChannel[];
  targets: string[];
  asset_name: string | null;
  asset_url: string | null;
  status: ContentStatus;
  scheduled_at: string | null;
  publications: Partial<Record<MarketingChannel, ChannelPublication>>;
  created_at: string;
  updated_at: string;
}
export interface ChannelPublication {
  id: string | null;
  url: string | null;
  published_at: string;
}
export interface StrategyDocument {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}
