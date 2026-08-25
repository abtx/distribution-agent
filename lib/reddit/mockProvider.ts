import type { RedditProvider } from "./provider";
export class MockRedditProvider implements RedditProvider {
  async searchOpportunities() {
    const d = new Date().toISOString();
    return [
      {
        id: "mock-share-startups-2026",
        subreddit: "startups",
        title: "Share your startup — August showcase",
        body: "Tell us what you're building, who it helps, and drop your link.",
        url: "https://reddit.com/r/startups",
        author: "AutoModerator",
        createdUtc: d,
        comments: 24,
      },
      {
        id: "mock-language-builders-2026",
        subreddit: "SideProject",
        title: "What did you build this week?",
        body: "Language tools and education projects especially welcome. Share your product.",
        url: "https://reddit.com/r/SideProject",
        author: "maker_mod",
        createdUtc: d,
        comments: 12,
      },
      {
        id: "mock-discussion-2026",
        subreddit: "Entrepreneur",
        title: "How do you stay focused?",
        body: "Looking for time management advice, not promotions.",
        url: "https://reddit.com/r/Entrepreneur",
        author: "focusedfounder",
        createdUtc: d,
        comments: 8,
      },
    ];
  }
}
