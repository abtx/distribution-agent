import type { RedditProvider } from "./provider";
export class MockRedditProvider implements RedditProvider {
  async searchOpportunities() {
    const d = new Date().toISOString();
    return [
      {
        id: "mock-share-startups-2026",
        subreddit: "startups",
        title: "Share your startup - August showcase",
        body: "Tell us what you're building, who it helps, and drop your link.",
        url: "https://www.reddit.com/r/startups/comments/1utpfsi/share_your_startup_quarterly_post/",
        author: "AutoModerator",
        createdUtc: d,
        comments: 24,
      },
      {
        id: "mock-language-builders-2026",
        subreddit: "SideProject",
        title: "What did you build this week?",
        body: "Language tools and education projects especially welcome. Share your product.",
        url: "https://www.reddit.com/r/SideProject/comments/1u70r9c/what_are_you_building_this_week_drop_your_project/",
        author: "maker_mod",
        createdUtc: d,
        comments: 12,
      },
      {
        id: "mock-discussion-2026",
        subreddit: "Entrepreneur",
        title: "How do you stay focused?",
        body: "Looking for time management advice, not promotions.",
        url: "https://www.reddit.com/r/Entrepreneur/comments/1lgx872/how_do_you_stay_focused_when_youre_building/",
        author: "focusedfounder",
        createdUtc: d,
        comments: 8,
      },
    ];
  }
}
