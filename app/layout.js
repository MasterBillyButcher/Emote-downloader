import { headers } from "next/headers";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { FAQ_ITEMS } from "@/lib/content";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

// IMPORTANT: replace with your real deployed URL once you have one. This
// is what OG images and canonical links resolve against. A placeholder
// here means social previews and canonical tags will point at the wrong
// place until you update it.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.vercel.app";

const TITLE = "Emote Grabber: Download 7TV, BTTV, FFZ & Twitch Sub Emotes as a Zip";
const DESCRIPTION =
  "Type a Twitch channel, pick 7TV, BTTV, FrankerFaceZ, or real Twitch Subscriber Emotes by tier, preview them, and download everything as one zip. Free, no sign-up, no ads or tracking.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Emote Grabber",
  },
  description: DESCRIPTION,
  applicationName: "Emote Grabber",
  keywords: [
    "twitch emote downloader",
    "7tv emote downloader",
    "bttv emote downloader",
    "frankerfacez emote downloader",
    "twitch subscriber emotes download",
    "download twitch emotes zip",
  ],
  authors: [{ name: "Emote Grabber" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Emote Grabber",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Emote Grabber",
    description: DESCRIPTION,
    url: SITE_URL,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (web browser)",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  },
];

export default async function RootLayout({ children }) {
  // Calling headers() is itself what opts this layout into per-request
  // dynamic rendering, which a nonce-based CSP requires (a nonce reused
  // across requests defeats the point of it - see Next.js's CSP docs).
  const nonce = (await headers()).get("x-nonce");

  // Runs before React hydrates, so the right theme is on <html> before the
  // first paint - without this, the page would flash dark-then-light (or
  // vice versa) on every load for anyone who chose the non-default theme.
  // Wrapped in try/catch: localStorage can throw in some private-browsing
  // modes, and a theme flash is a much smaller problem than a broken page.
  const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {/* Runs before anything else in the body paints, since this is a
            blocking (non-async) inline script and the browser executes it
            before continuing to parse what follows - same anti-flash effect
            as a <head> script, without manually adding <head> elements to
            the root layout (Next's own docs warn against that, since it can
            conflict with the Metadata API's head management). */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
