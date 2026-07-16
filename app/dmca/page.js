import Link from "next/link";

export const metadata = {
  title: "Copyright & DMCA Policy",
  description: "Copyright and takedown policy for Emote Grabber.",
};

export default function DmcaPage() {
  return (
    <main className="page legal-page">
      <p className="legal-back">
        <Link href="/">← back to Emote Grabber</Link>
      </p>
      <h1 className="legal-title">Copyright &amp; DMCA Policy</h1>
      <p className="legal-updated">
        Last updated: [DATE] — <em>placeholder, update when you publish this</em>
      </p>

      <div className="legal-notice">
        <strong>Template notice:</strong> this is general-purpose language, not a substitute for
        legal advice. If you receive a real takedown notice, take it seriously and consider
        talking to a lawyer, not just relying on this page.
      </div>

      <section>
        <h2>1. Where the files actually come from</h2>
        <p>
          The Operator does not host, store, or maintain a copy of any emote image. Every file
          that reaches you is streamed directly, in real time, from the originating platform&apos;s
          own CDN (7TV, BetterTTV, FrankerFaceZ, or Twitch) at the moment you request it. Nothing
          persists on this Service&apos;s infrastructure after your download completes.
        </p>
      </section>

      <section>
        <h2>2. Ownership</h2>
        <p>
          All emote artwork is the property of its original creator and/or the platform hosting
          it. This Service does not claim any ownership over emote content and does not grant any
          license to reuse, redistribute, or sell it.
        </p>
      </section>

      <section>
        <h2>3. Reporting a concern</h2>
        <p>
          Because the Operator does not store any files, a takedown request is often more directly
          effective when sent to the platform actually hosting the content (7TV, BetterTTV,
          FrankerFaceZ, or Twitch) rather than to the Operator. That said, if you believe this
          Service is being used in a way that infringes your rights, you can contact the Operator
          at <strong>[your-email@example.com]</strong> with:
        </p>
        <ul>
          <li>A description of the copyrighted work you believe is affected</li>
          <li>The channel name and platform (7TV / BTTV / FFZ / Twitch) involved</li>
          <li>Your contact information</li>
          <li>A statement that you have a good-faith belief the use is not authorized</li>
        </ul>
        <p>The Operator will review legitimate requests and may respond by restricting access to the Service for the disputed source.</p>
      </section>

      <section>
        <h2>4. Repeat concerns</h2>
        <p>The Operator reserves the right to restrict or disable access to the Service, in whole or for specific sources, in response to repeated or credible concerns.</p>
      </section>

      <p className="legal-links">
        <Link href="/terms">Terms of Service</Link> · <Link href="/privacy">Privacy Policy</Link>
      </p>
    </main>
  );
}
