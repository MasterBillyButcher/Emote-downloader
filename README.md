# Emote Grabber (web)

Type a channel name, pick sources/format, click a button, get a zip. Runs as a Next.js app
on Vercel: no install, works from any browser (phone included), dark/light theme included.

## Sources

- **7TV**, **BTTV**, **FrankerFaceZ** — no credentials needed, work out of the box.
- **Twitch Emotes** — one checkbox that pulls in all six Twitch-native categories at once:
  Subscriber Emotes (filterable by tier), Follower Emotes, Bits/Cheer Emotes, Cheermotes,
  Subscriber Loyalty Badges, and Cheer Badges. Requires `TWITCH_CLIENT_ID` /
  `TWITCH_CLIENT_SECRET` (see below) — without them, this whole source returns a clear error
  instead of silently skipping.
  - Follower Emotes will come back empty for most channels: Twitch stopped letting most
    channels add new ones in 2023. That's expected, not a bug.
  - Loyalty Badges and Cheer Badges hit a different Twitch endpoint (`chat/badges`, not
    `chat/emotes`) that has at times required a broadcaster's own login rather than an
    app-level credential. If Twitch enforces that on a given deployment, those two sources
    fail with a clear per-source error — everything else in the same download still
    completes normally.

## Preview before you download

Click **👁 Preview** to see actual thumbnails of what would be in the zip, grouped by source,
before committing to a download — including a live search box to filter by emote name once
results are in. For Twitch Subscriber Emotes specifically, the preview also shows a **Tier 1 /
Tier 2 / Tier 3 breakdown with the raw total before any filtering**, so you can check it
directly against what Twitch's own creator dashboard shows for that channel. Preview and
download share the exact same underlying emote-listing code (`lib/emote-sources.js`), so
what you see in the preview is what ends up in the zip — there's no separate, divergent
preview-only code path.

## What's in the zip

Every zip includes a `download-report.json` alongside the emote files: per-source
requested/downloaded/failed counts, plus the name and reason for any emote that failed. A
single failed emote doesn't stop or restart the rest of the download — you'll just see it
listed in the report. If anything did fail, the page shows a **Retry failed** button after
the download completes, which re-downloads just those specific emotes as a small
`-retry.zip` rather than starting the whole thing over.

## How it avoids Vercel's 4.5MB response limit

Vercel serverless functions cap normal (buffered) responses at 4.5MB: a zip of a few hundred
GIF emotes blows past that easily. `app/api/download/route.js` gets around this by
**streaming** the zip: it opens the HTTP response immediately and pipes each emote into the
archive as it's fetched, instead of building the whole zip in memory first. Streaming
responses aren't subject to the 4.5MB cap. The page's "stream.log" panel and progress bar
show this happening in real time — those are actual bytes arriving, not a fake animation.

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
3. Framework preset: Next.js (auto-detected): no build settings to change
4. Before the first deploy (or right after, then redeploy), add environment variables under
   **Project Settings → Environment Variables**:

| Name                   | Required?                           | Value                                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TWITCH_CLIENT_ID`     | Only for the "Twitch Emotes" source | from https://dev.twitch.tv/console/apps                                                                                                                                                                                  |
| `TWITCH_CLIENT_SECRET` | Only for the "Twitch Emotes" source | from the same app                                                                                                                                                                                                        |
| `ACCESS_CODE`          | Optional                            | any string: gates the site behind a simple shared code                                                                                                                                                                   |
| `NEXT_PUBLIC_SITE_URL` | Recommended                         | your real deployed URL, e.g. `https://emote-grabber.vercel.app`: used for the sitemap, robots.txt, canonical/OG tags, and structured data. Without it, those fall back to a placeholder and will point at the wrong URL. |

5. Deploy. You'll get a `*.vercel.app` URL.

### 3. (Recommended) Set `ACCESS_CODE`

Without it, **anyone with the URL** can use your deployment: including burning through your
Twitch API quota if you've set up Twitch credentials, and running up bandwidth on your Vercel
usage. Setting `ACCESS_CODE` means the site won't build a zip for someone unless they also enter
that code in the "Access code" field. It's a shared secret, not real auth: fine for keeping a
personal tool private, not for anything that needs real user accounts.

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Create a `.env.local` (copy `.env.example`) for the Twitch
credentials / access code to work locally too.

Other scripts:

```bash
npm test     # runs the unit test suite (node --test)
npm run lint  # ESLint
npm run format  # Prettier, writes changes
npm run build  # production build
```

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, tests, and a build check on
every push and pull request against `main`.

## Legal page

A single `/legal` page (linked from the footer) covers Terms of Service, Privacy Policy, and
Copyright in one place, with in-page jump links to each section. It's a reasonable baseline for a
small tool like this: not legal advice, and not a substitute for an actual lawyer if you're
worried about real exposure. It does **not**, and cannot, prevent Twitch from suspending your
Developer account if Twitch decides this use case violates their Developer Services Agreement:
that's a platform policy decision, outside what any page on your own site can control. If that
risk matters to you, keep `ACCESS_CODE` set so the Twitch-derived sources (the ones that use your
Developer credentials) aren't wide open to the public internet.

## Security headers

`next.config.mjs` sets `X-Frame-Options`, `X-Content-Type-Options`, `Cross-Origin-Opener-Policy`,
and `Strict-Transport-Security` on every route. `middleware.js` separately generates a fresh
**nonce-based Content-Security-Policy** on every request — no `unsafe-inline` anywhere, on either
`script-src` or `style-src`. The one inline script this app renders itself (the theme-init script
in `app/layout.js`, which prevents a flash of the wrong dark/light theme on load) carries that
same per-request nonce. Because the CSP needs a fresh nonce per request, this forces dynamic
rendering of every page — there's no static HTML shell served from Vercel's edge cache. That's a
real tradeoff for a mostly-static site: worth knowing if you're chasing cold-start latency or edge
caching later.

## Theme

A dark/light toggle lives in the top nav. It respects the visitor's OS preference on first visit,
persists their choice in `localStorage` after that, and applies before first paint via a blocking
inline script (so there's no flash of the wrong theme). All colors are CSS custom properties in
`app/globals.css`, overridden under a `[data-theme="light"]` selector — most component styles
never reference a raw color, just the variables, so they adapt automatically.

## Notes and limits

- **Duration**: the API route is configured for up to 120 seconds (`maxDuration` in
  `route.js`). Vercel Hobby projects get up to 300s with Fluid Compute (on by default for new
  projects): raise the number if you're hitting timeouts on channels with huge emote libraries.
  Emotes download 8-at-a-time per source to keep this fast.
- The Twitch app access token is cached in memory between requests (until near expiry) rather
  than re-requested on every download.
- Tier filtering, global-emote inclusion, and GIF/PNG/both format filtering all work the same way
  they did in the desktop version.
- File extensions are always based on the real HTTP `content-type` of each download, never
  guessed: so a static BTTV emote served as webp stays a `.webp`, not a mislabeled `.gif`.
- Estimated zip size (shown after Preview) is a heuristic based on animated-vs-static counts, not
  a real measurement — preview deliberately never downloads actual image bytes, so there's nothing
  to measure a real size from ahead of time.

## Page structure

The page is intentionally minimal: a sticky nav (brand mark, Get emotes / FAQ links, theme
toggle), a short hero, the tool itself, the live preview panel, and a compact FAQ. There's no
separate "how it works" walkthrough or platform-by-platform explainer section — the form's own
inline hints under each checkbox cover that. The FAQ text lives in one place (`lib/content.js`)
and is rendered both on the page and as `FAQPage` JSON-LD in `layout.js`, so the visible FAQ and
the structured data can't drift apart.

## Branding

The icon, OG image, and nav logo are an original mark (a gradient download-arrow-in-a-pouch),
generated at request time via `next/og` in `app/icon.js` / `app/opengraph-image.js` — no external
image assets. Deliberately not using any of the actual 7TV/BTTV/FFZ/Twitch logos or any
copyrighted character art, consistent with the "no affiliation" language on `/legal`.

## Testing

`tests/emote-sources.test.js` covers the pure helper functions in `lib/emote-sources.js`
(`resolveExtension`, `sanitizeFilename`, `extractChannelName`, `isFormatAllowed`) using Node's
built-in test runner — no test framework dependency. The functions that call third-party APIs
aren't covered by automated tests; that would need mocking 7TV/BTTV/FFZ/Twitch responses, which
hasn't been set up.

## SEO

- `app/robots.js` and `app/sitemap.js` generate `/robots.txt` and `/sitemap.xml` automatically.
- `app/opengraph-image.js` and `app/icon.js` generate a real PNG social-share image and favicon
  at build time (using Next's `next/og`: no external image assets needed).
- `layout.js` sets full Open Graph / Twitter Card metadata, a title template, and two JSON-LD
  blocks (`WebApplication` + `FAQPage`).
- **Set `NEXT_PUBLIC_SITE_URL`** once you have a real domain: everything above resolves against
  it, and leaving it as the placeholder means search engines and social platforms see the wrong
  URL.
- Preview's "Load more" reveals more of the _already-fetched_ list client-side rather than
  re-querying the server: the upstream APIs return their full emote list in one call regardless,
  so there was nothing to actually paginate server-side.
