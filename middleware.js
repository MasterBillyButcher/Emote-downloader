import { NextResponse } from "next/server";

// Generates a fresh nonce per request and sets it on both the outgoing
// request (so a Server Component can read it via headers() and attach it to
// the one inline script we render ourselves, the JSON-LD block) and the
// response (the actual CSP header the browser enforces). Following the
// pattern from Next.js's own CSP docs, since getting this wrong either
// breaks the app (blank page) or silently reintroduces the unsafe-inline
// gap it exists to close.
export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data: https:;
    connect-src 'self' https:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    // Skip Next's static asset/image pipeline and other framework
    // internals - a CSP header on those has no purpose and costs a
    // middleware invocation for nothing.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
