import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Emote Grabber.",
};

export default function TermsPage() {
  return (
    <main className="page legal-page">
      <p className="legal-back">
        <Link href="/">← back to Emote Grabber</Link>
      </p>
      <h1 className="legal-title">Terms of Service</h1>
      <p className="legal-updated">
        Last updated: [DATE] — <em>placeholder, update when you publish this</em>
      </p>

      <div className="legal-notice">
        <strong>Template notice:</strong> this page is a reasonable starting point for a small
        personal/hobby tool, not a substitute for a lawyer reviewing your specific situation.
        Fill in the bracketed placeholders below before relying on it.
      </div>

      <section>
        <h2>1. What this is</h2>
        <p>
          Emote Grabber (&quot;the Service&quot;) is a tool that fetches emote images from 7TV,
          BetterTTV, FrankerFaceZ, and Twitch&apos;s own API on your behalf, based on a channel
          name you provide, and packages them into a zip file for download.
        </p>
      </section>

      <section>
        <h2>2. No affiliation</h2>
        <p>
          The Service is independently operated and is not affiliated with, endorsed by, or
          sponsored by Twitch Interactive, Inc., 7TV, BetterTTV, or FrankerFaceZ. All product
          names, logos, and brands referenced are the property of their respective owners and are
          used only to describe which services this tool is compatible with.
        </p>
      </section>

      <section>
        <h2>3. Ownership of emote content</h2>
        <p>
          Emote artwork remains the property of its original creators and/or the platform hosting
          it. Using this Service does not grant you any license, ownership, or right to
          redistribute, sell, or commercially use downloaded emotes beyond what the original
          platform and creator already permit. You are responsible for ensuring your use of
          anything you download complies with the terms of the platform it came from and with
          applicable copyright law.
        </p>
      </section>

      <section>
        <h2>4. Platform compliance is on you</h2>
        <p>
          Your use of this Service to access Twitch, 7TV, BetterTTV, or FrankerFaceZ data must
          also comply with each platform&apos;s own terms of service and developer policies. The
          Operator is not responsible if a platform rate-limits, blocks, or otherwise restricts
          access as a result of how the Service or its API credentials are used.
        </p>
      </section>

      <section>
        <h2>5. No warranty</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranty
          of any kind. Third-party APIs this Service depends on can change, rate-limit, or go
          offline without notice, which may cause downloads to fail or return incomplete results.
        </p>
      </section>

      <section>
        <h2>6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, the Operator is not liable for any indirect,
          incidental, or consequential damages arising from use of the Service, including but not
          limited to lost data, lost access to third-party accounts, or disputes over downloaded
          content.
        </p>
      </section>

      <section>
        <h2>7. Changes</h2>
        <p>These Terms may be updated from time to time. Continued use of the Service after a change constitutes acceptance of the update.</p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Questions about these Terms: <strong>[your-email@example.com]</strong> or via{" "}
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </section>

      <p className="legal-links">
        <Link href="/privacy">Privacy Policy</Link> · <Link href="/dmca">Copyright / DMCA</Link>
      </p>
    </main>
  );
}
