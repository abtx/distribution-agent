import type { MarketingChannel } from "@/lib/types";
export const channelNames: Record<MarketingChannel, string> = {
  x: "X",
  reddit: "Reddit",
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};
export function ChannelBadge({ channel }: { channel: MarketingChannel }) {
  return <span className={`channel ${channel}`}>{channelNames[channel]}</span>;
}
