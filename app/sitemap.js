export default function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.vercel.app";
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/dmca`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
