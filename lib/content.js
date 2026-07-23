// Single source of truth for copy that appears in more than one place.
// The FAQ text rendered on the page is the exact same text that goes into
// the FAQPage JSON-LD in layout.js. Two renderings of the same array,
// never two hand-maintained copies that can drift apart.

export const FAQ_ITEMS = [
  {
    q: "Does this actually get every subscriber tier?",
    a: "Yes. It calls Twitch's own Get Channel Emotes endpoint and reads the tier field Twitch attaches to each emote (1000/2000/3000). If you want to check for yourself rather than take that on faith, click Preview: it shows a raw Tier 1/2/3 breakdown before any filtering, so you can compare it directly against what the channel's own dashboard shows.",
  },
  {
    q: "Is this affiliated with Twitch, 7TV, BTTV, or FrankerFaceZ?",
    a: "No. This is an independent tool that calls each platform's public API. It isn't endorsed by or affiliated with any of them.",
  },
  {
    q: "What happens if a channel doesn't use one of these platforms?",
    a: "That source's folder in the zip is just empty. It's not an error, plenty of channels only use one or two of the four.",
  },
  {
    q: "Where do the downloaded files actually come from?",
    a: "Directly from each platform's own CDN (cdn.7tv.app, cdn.betterttv.net, cdn.frankerfacez.com, static-cdn.jtvnw.net) at the highest resolution available. Nothing is re-encoded or compressed on the way through.",
  },
  {
    q: "What if an individual emote fails to download?",
    a: "Every zip includes a download-report.json listing how many emotes were requested vs. actually downloaded per source, plus the name and reason for any that failed. A single failed emote doesn't stop or restart the rest of the download.",
  },
  {
    q: "Why is Twitch Follower Emotes usually empty?",
    a: "Twitch restricted the ability to add new follower emotes for most channels starting in 2023. Only channels that had them before that change (or that still qualify) will have any. An empty folder here means the channel genuinely doesn't have any, not that something went wrong.",
  },
  {
    q: "Does Subscriber Loyalty Badges always work?",
    a: "Usually, but not guaranteed. It's a different Twitch API endpoint than the emote ones, and Twitch has at times restricted it to a broadcaster's own login rather than an app-level credential like this tool uses. If it fails on a given deployment, that source will show a clear error instead of breaking the rest of the download.",
  },
];
