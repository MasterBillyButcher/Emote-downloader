/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Applies to every route.
        source: "/(.*)",
        headers: [
          // Prevents the site from being embedded in an iframe on another
          // origin (clickjacking mitigation). Lighthouse flagged this as
          // missing entirely.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from MIME-sniffing a response away from its
          // declared Content-Type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Isolates the top-level browsing context from cross-origin
          // popups/openers (COOP). Lighthouse flagged this as missing.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Forces HTTPS on repeat visits for a year, including subdomains.
          // Only has effect once the site is actually served over HTTPS
          // (which it will be on Vercel) — harmless as a no-op otherwise.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Baseline Content-Security-Policy. This is deliberately permissive
          // on img-src/connect-src because the whole point of this app is
          // fetching emote thumbnails and zip bytes from 7TV/BTTV/FFZ/Twitch
          // CDNs at runtime — a strict allowlist would break the preview
          // grid and the download itself. Script/style/frame directives are
          // locked down since nothing here legitimately needs third-party
          // scripts or embedding.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
