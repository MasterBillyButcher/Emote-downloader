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
  "Type a Twitch channel, pick 7TV, BTTV, FrankerFaceZ, or real Twitch Subscriber Emotes by tier, preview them, and download everything as one zip. Free, open source, self-hosted.";

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

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {children}
        <script
          type="application/ld+json"
          nonce={nonce}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
