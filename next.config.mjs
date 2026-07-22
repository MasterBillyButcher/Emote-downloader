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
          // (which it will be on Vercel), harmless as a no-op otherwise.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // NOTE: Content-Security-Policy is NOT set here. It's generated
          // per-request in middleware.js instead, because it needs a fresh
          // nonce on every request (a static header can't do that). See
          // middleware.js and ADR-007 in the Developer Context doc.
        ],
      },
    ];
  },
};

export default nextConfig;
