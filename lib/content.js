// Single source of truth for copy that appears in more than one place —
// the FAQ text rendered on the page is the exact same text that goes into
// the FAQPage JSON-LD in layout.js. Two renderings of the same array,
// never two hand-maintained copies that can drift apart.

export const STEPS = [
  {
    num: "01",
    title: "Type a channel",
    body: "Paste a Twitch username or the full channel URL. We resolve it to a Twitch ID via a public lookup — no login required.",
  },
  {
    num: "02",
    title: "Pick sources & format",
    body: "Choose any mix of 7TV, BTTV, FrankerFaceZ, and Twitch Subscriber Emotes, then GIF-only, PNG-only, or both. Preview shows exactly what matches before you commit.",
  },
  {
    num: "03",
    title: "Get your zip",
    body: "The server streams the zip back as it's built, so it isn't capped by Vercel's usual response size limit — works even for channels with hundreds of emotes.",
  },
];

export const SOURCE_INFO = [
  {
    id: "7tv",
    name: "7TV",
    body: "Community-run third-party emote service, currently the most widely installed one. Most 7TV emotes are animated GIF/WEBP by default. Viewers need the 7TV extension (or a client that supports it) to see them rendered in chat.",
  },
  {
    id: "bttv",
    name: "BetterTTV (BTTV)",
    body: "One of the oldest third-party emote extensions still active, predating 7TV. Mix of static and animated emotes, plus chat features unrelated to emotes that this tool doesn't touch.",
  },
  {
    id: "ffz",
    name: "FrankerFaceZ (FFZ)",
    body: "Another long-running third-party extension. Historically PNG-heavy, though animated emotes exist too. Also ships chat-UI features beyond emotes, again out of scope here.",
  },
  {
    id: "twitch",
    name: "Twitch Subscriber Emotes",
    body: "The only source here that's native to Twitch itself — visible to every viewer with no extension needed, unlocked by subscription tier. Pulling these requires a Twitch Developer app (see the Twitch Subscriber Emotes field below).",
  },
];

export const FAQ_ITEMS = [
  {
    q: "Does this actually get every subscriber tier, not just Tier 1?",
    a: "Yes — it calls Twitch's own Get Channel Emotes endpoint and reads the tier field Twitch attaches to each emote (1000/2000/3000). If you want to check for yourself rather than take that on faith, click Preview: it shows a raw Tier 1/2/3 breakdown before any filtering, so you can compare it directly against what the channel's own dashboard shows.",
  },
  {
    q: "Is this affiliated with Twitch, 7TV, BTTV, or FrankerFaceZ?",
    a: "No. This is an independent tool that calls each platform's public API. It isn't endorsed by or affiliated with any of them.",
  },
  {
    q: "Why does Twitch Subscriber Emotes need extra setup but the others don't?",
    a: "7TV, BTTV, and FFZ expose fully public, unauthenticated endpoints. Twitch's API requires an authenticated app for this specific endpoint even though the emote data itself is public — that's a Twitch platform requirement, not a choice this tool made.",
  },
  {
    q: "What happens if a channel doesn't use one of these platforms?",
    a: "That source's folder in the zip is just empty. It's not an error — plenty of channels only use one or two of the four.",
  },
  {
    q: "Does this work on mobile?",
    a: "Yes, it's a normal web page — no install, works in any modern mobile browser.",
  },
  {
    q: "Where do the downloaded files actually come from?",
    a: "Directly from each platform's own CDN (cdn.7tv.app, cdn.betterttv.net, cdn.frankerfacez.com, static-cdn.jtvnw.net) at the highest resolution available. Nothing is re-encoded or compressed on the way through.",
  },
];
