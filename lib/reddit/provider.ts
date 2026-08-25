import type { RedditPost } from "../types";
export interface RedditProvider {
  searchOpportunities(): Promise<RedditPost[]>;
}
