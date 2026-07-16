# Emote Grabber (web)

Type a channel name, pick sources/format, click a button, get a zip. Runs as a Next.js app
on Vercel — no install, works from any browser (phone included).

Reuses the same 7TV / BTTV / FFZ / Twitch-subscriber-emote logic as the desktop CLI version,
just moved server-side into a Vercel serverless function so it can run from a URL instead of
`node index.mjs`.

## Preview before you download

Click **👁 Preview** (next to Download) to see actual thumbnails of what would be in the zip,
grouped by source, before committing to a download. For Twitch Subscriber Emotes specifically,
the preview also shows a **Tier 1 / Tier 2 / Tier 3 breakdown with the raw total before any
filtering** — so if you're ever unsure whether all tiers actually came through, this is the way
to check it directly against what Twitch's own creator dashboard shows for that channel, instead
of trusting the zip blindly. Preview and download share the exact same underlying emote-listing
code (`lib/emote-sources.js`), so what you see in the preview is what would end up in the zip.

## How it avoids Vercel's 4.5MB response limit

Vercel serverless functions cap normal (buffered) responses at 4.5MB — a zip of a few hundred
GIF emotes blows past that easily. `app/api/download/route.js` gets around this by **streaming**
the zip: it opens the HTTP response immediately and pipes each emote into the archive as it's
fetched, instead of building the whole zip in memory first and sending it as one block. Streaming
responses aren't subject to the 4.5MB cap. The page's "stream.log" panel shows this happening in
real time — those are actual bytes arriving, not a fake progress bar.

## Deploy it

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Emote grabber"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### 2. Import into Vercel

1. Go to https://vercel.com/new
2. Import the GitHub repo you just pushed
3. Framework preset: Next.js (auto-detected) — no build settings to change
4. Before the first deploy (or right after, then redeploy), add environment variables under
   **Project Settings → Environment Variables**:

| Name | Required? | Value |
|---|---|---|
| `TWITCH_CLIENT_ID` | Only for Subscriber Emotes | from https://dev.twitch.tv/console/apps |
| `TWITCH_CLIENT_SECRET` | Only for Subscriber Emotes | from the same app |
| `ACCESS_CODE` | Optional | any string — gates the site behind a simple shared code |
| `NEXT_PUBLIC_SITE_URL` | Recommended | your real deployed URL, e.g. `https://emote-grabber.vercel.app` — used for the sitemap, robots.txt, canonical/OG tags, and structured data. Without it, those fall back to a placeholder and will point at the wrong URL. |

5. Deploy. You'll get a `*.vercel.app` URL.

### 3. (Recommended) Set `ACCESS_CODE`

Without it, **anyone with the URL** can use your deployment — including burning through your
Twitch API quota if you've set up subscriber emotes, and running up bandwidth on your Vercel
usage. Setting `ACCESS_CODE` means the site won't build a zip for someone unless they also enter
that code in the "Access code" field. It's a shared secret, not real auth — fine for keeping a
personal tool private, not for anything that needs real user accounts.

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Create a `.env.local` (copy `.env.example`) for the Twitch
credentials / access code to work locally too.

## Notes and limits

- **Duration**: the API route is configured for up to 120 seconds (`maxDuration` in
  `route.js`). Vercel Hobby projects get up to 300s with Fluid Compute (on by default for new
  projects) — raise the number if you're hitting timeouts on channels with huge emote libraries.
  Emotes download 8-at-a-time per source to keep this fast.
- **Twitch subscriber emotes** only work if `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` are set on
  the deployment — if they're missing, the site returns a clear error instead of silently
  skipping that source.
- Tier filtering, global-emote inclusion, and GIF/PNG/both format filtering all work the same way
  they did in the desktop version.
- File extensions are always based on the real HTTP `content-type` of each download, never
  guessed — so a static BTTV emote served as webp stays a `.webp`, not a mislabeled `.gif`.

## Page structure

The site is no longer just a bare form — it's a full page with a sticky nav (`How it works` /
`Sources` / `Get emotes` / `FAQ`), a 3-step explainer, a section describing what each of the four
platforms actually is, the tool itself, and an FAQ. The FAQ text lives in one place
(`lib/content.js`) and is rendered both on the page and as `FAQPage` JSON-LD in `layout.js` — so
there's no risk of the visible FAQ and the structured data drifting apart.

## SEO

- `app/robots.js` and `app/sitemap.js` generate `/robots.txt` and `/sitemap.xml` automatically.
- `app/opengraph-image.js` and `app/icon.js` generate a real PNG social-share image and favicon
  at build time (using Next's `next/og` — no external image assets needed).
- `layout.js` sets full Open Graph / Twitter Card metadata, a title template, and two JSON-LD
  blocks (`WebApplication` + `FAQPage`).
- **Set `NEXT_PUBLIC_SITE_URL`** once you have a real domain — everything above resolves against
  it, and leaving it as the placeholder means search engines and social platforms see the wrong
  URL.
- Preview's "Load more" reveals more of the *already-fetched* list client-side rather than
  re-querying the server — the upstream APIs return their full emote list in one call regardless,
  so there was nothing to actually paginate server-side.
