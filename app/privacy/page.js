import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Emote Grabber.",
};

export default function PrivacyPage() {
  return (
    <main className="page legal-page">
      <p className="legal-back">
        <Link href="/">← back to Emote Grabber</Link>
      </p>
      <h1 className="legal-title">Privacy Policy</h1>
      <p className="legal-updated">
        Last updated: [DATE] — <em>placeholder, update when you publish this</em>
      </p>

      <div className="legal-notice">
        <strong>Template notice:</strong> this describes how the Service is built to behave. If
        you change the code, keep this page in sync with what it actually does.
      </div>

      <section>
        <h2>1. What we collect</h2>
        <p>
          When you use the Service, the channel name/URL you enter and the options you pick
          (sources, format, tier, access code if one is set) are sent to a server-side function to
          fulfill your request. This data is used only to process that single request — the
          Service does not have a database and does not persist this information after the
          request completes.
        </p>
      </section>

      <section>
        <h2>2. No accounts, no cookies</h2>
        <p>
          The Service does not require an account, does not use tracking cookies, and does not run
          third-party analytics or advertising scripts.
        </p>
      </section>

      <section>
        <h2>3. Third-party requests</h2>
        <p>
          To fulfill your request, the Service makes server-side calls to 7TV, BetterTTV,
          FrankerFaceZ, and (if configured) Twitch&apos;s API. Those platforms&apos; own privacy
          policies govern how they handle any data related to those requests on their end.
        </p>
      </section>

      <section>
        <h2>4. Hosting-level logging</h2>
        <p>
          This Service is hosted on Vercel, which may collect standard infrastructure-level logs
          (such as IP addresses) for security and abuse-prevention purposes, independent of
          anything this Service itself does. See{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
            Vercel&apos;s Privacy Policy
          </a>{" "}
          for details.
        </p>
      </section>

      <section>
        <h2>5. Children&apos;s privacy</h2>
        <p>The Service is not directed at children under 13 and does not knowingly collect information from them.</p>
      </section>

      <section>
        <h2>6. Contact</h2>
        <p>
          Questions about this policy: <strong>[your-email@example.com]</strong>.
        </p>
      </section>

      <p className="legal-links">
        <Link href="/terms">Terms of Service</Link> · <Link href="/dmca">Copyright / DMCA</Link>
      </p>
    </main>
  );
}
