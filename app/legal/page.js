import Link from "next/link";

export const metadata = {
  title: "Legal: Terms, Privacy & Copyright",
  description: "Terms of Service, Privacy Policy, and Copyright/DMCA policy for Emote Grabber.",
};

export default function LegalPage() {
  return (
    <main className="page legal-page">
      <p className="legal-back">
        <Link href="/">← back to Emote Grabber</Link>
      </p>
      <h1 className="legal-title">Legal</h1>
      <p className="legal-updated">Effective July 16, 2026</p>

      <nav className="legal-jumpnav" aria-label="Legal document sections">
        <a href="#terms">Terms of Service</a>
        <a href="#privacy">Privacy Policy</a>
        <a href="#copyright">Copyright</a>
      </nav>

      <section id="terms">
        <h2>Terms of Service</h2>

        <h3>What this is</h3>
        <p>
          Emote Grabber fetches emote images from 7TV, BetterTTV, FrankerFaceZ, and Twitch&apos;s own API based on a
          channel name you provide, and packages them into a zip file for download.
        </p>

        <h3>No affiliation</h3>
        <p>
          The Service is independently operated and is not affiliated with, endorsed by, or sponsored by Twitch
          Interactive, Inc., 7TV, BetterTTV, or FrankerFaceZ. Product names, logos, and brands referenced belong to
          their respective owners and are used only to describe which services this tool is compatible with.
        </p>

        <h3>Ownership of emote content</h3>
        <p>
          Emote artwork remains the property of its original creator and/or the platform hosting it. Using this Service
          does not grant any license, ownership, or right to redistribute, sell, or commercially use downloaded emotes
          beyond what the original platform and creator already permit. You are responsible for ensuring your own use of
          anything you download complies with the terms of the platform it came from and with applicable copyright law.
        </p>

        <h3>Platform compliance is on you</h3>
        <p>
          Your use of this Service to access Twitch, 7TV, BetterTTV, or FrankerFaceZ data must also comply with each
          platform&apos;s own terms of service and developer policies. The Operator is not responsible if a platform
          rate-limits, blocks, or otherwise restricts access as a result of how the Service or its API credentials are
          used.
        </p>

        <h3>No warranty</h3>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranty of any kind.
          Third-party APIs it depends on can change, rate-limit, or go offline without notice, which may cause downloads
          to fail or return incomplete results.
        </p>

        <h3>Limitation of liability</h3>
        <p>
          To the maximum extent permitted by law, the Operator is not liable for any indirect, incidental, or
          consequential damages arising from use of the Service, including lost data, lost access to third-party
          accounts, or disputes over downloaded content.
        </p>

        <h3>Changes</h3>
        <p>
          These Terms may be updated from time to time. Continued use of the Service after a change means you accept the
          update.
        </p>
      </section>

      <section id="privacy">
        <h2>Privacy Policy</h2>

        <h3>What&apos;s collected</h3>
        <p>
          The channel name/URL you enter and the options you pick (sources, format, tier, access code if one is set) are
          sent to a server-side function to fulfill that request. The Service has no database and does not persist this
          information after the request completes.
        </p>

        <h3>No accounts, no cookies</h3>
        <p>
          The Service does not require an account, does not use tracking cookies, and does not run third-party analytics
          or advertising scripts.
        </p>

        <h3>Third-party requests</h3>
        <p>
          To fulfill your request, the Service makes server-side calls to 7TV, BetterTTV, FrankerFaceZ, and (if
          configured) Twitch&apos;s API. Those platforms&apos; own privacy policies govern how they handle data related
          to those requests on their end.
        </p>

        <h3>Hosting-level logging</h3>
        <p>
          This Service runs on standard cloud hosting infrastructure, which may collect infrastructure-level logs (such
          as IP addresses) for security and abuse prevention, independent of anything the Service itself does.
        </p>

        <h3>Children&apos;s privacy</h3>
        <p>The Service is not directed at children under 13 and does not knowingly collect information from them.</p>
      </section>

      <section id="copyright">
        <h2>Copyright</h2>

        <h3>Where the files actually come from</h3>
        <p>
          The Operator does not host, store, or maintain a copy of any emote image. Every file that reaches you is
          streamed directly, in real time, from the originating platform&apos;s own CDN (7TV, BetterTTV, FrankerFaceZ,
          or Twitch) at the moment you request it. Nothing persists on the Service&apos;s infrastructure after your
          download completes.
        </p>

        <h3>Ownership</h3>
        <p>
          All emote artwork is the property of its original creator and/or the platform hosting it. This Service does
          not claim ownership over emote content and does not grant any license to reuse, redistribute, or sell it.
        </p>

        <h3>Rights concerns</h3>
        <p>
          Because the Operator does not store any files, a concern is often resolved more directly by contacting the
          platform actually hosting the content (7TV, BetterTTV, FrankerFaceZ, or Twitch) rather than the Operator of
          this Service. The Operator reserves the right to restrict or disable access to the Service, in whole or for a
          specific source, at their discretion in response to a credible concern.
        </p>
      </section>
    </main>
  );
}
