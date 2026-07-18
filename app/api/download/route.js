import archiver from "archiver";
import { PassThrough, Readable } from "node:stream";
import {
  extractChannelName,
  resolveTwitchId,
  fetch7TVToArchive,
  fetchBTTVToArchive,
  fetchFFZToArchive,
  fetchTwitchSubEmotesToArchive,
} from "@/lib/emote-sources";

// Node.js runtime is required: archiver relies on Node streams, which
// aren't available in the Edge runtime.
export const runtime = "nodejs";

// Allows the function to run longer than the platform default so bigger
// channels (lots of 7TV/BTTV/FFZ emotes) have time to finish. Vercel Hobby
// projects get up to 300s with Fluid Compute (on by default for new
// projects); Pro/Enterprise can go higher. Lower this if your plan caps it.
export const maxDuration = 120;

export async function POST(req) {
  // Optional shared-secret protection. Only enforced if ACCESS_CODE is set
  // in your Vercel project's environment variables. Leave it unset to run
  // with no gate (fine for personal/private use, riskier for a public URL).
  const requiredCode = process.env.ACCESS_CODE;
  if (requiredCode) {
    const providedCode = req.headers.get("x-access-code");
    if (providedCode !== requiredCode) {
      return Response.json({ error: "Invalid or missing access code." }, { status: 401 });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { channel, sources = [], includeGlobal = false, format = "both", tier = "all" } = body;

  if (!channel || !String(channel).trim()) {
    return Response.json({ error: "Enter a channel name or URL." }, { status: 400 });
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    return Response.json({ error: "Pick at least one emote source." }, { status: 400 });
  }

  const channelLogin = extractChannelName(channel);

  let twitchUser;
  try {
    twitchUser = await resolveTwitchId(channelLogin);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 404 });
  }

  if (sources.includes("twitch") && (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET)) {
    return Response.json(
      { error: "Twitch Subscriber Emotes need TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET set in this deployment's environment variables." },
      { status: 400 }
    );
  }

  const archive = archiver("zip", { zlib: { level: 9 } });
  const passThrough = new PassThrough();
  archive.on("error", (err) => passThrough.destroy(err));
  archive.pipe(passThrough);

  // Fire off the actual downloading without awaiting it here. This lets us
  // return a streaming Response immediately, so bytes start reaching the
  // browser as soon as the first emote is fetched instead of waiting for
  // everything (which is what avoids the 4.5MB non-streaming response cap).
  (async () => {
    try {
      if (sources.includes("7tv")) {
        await fetch7TVToArchive(archive, twitchUser.id, includeGlobal, format);
      }
      if (sources.includes("bttv")) {
        await fetchBTTVToArchive(archive, twitchUser.id, includeGlobal, format);
      }
      if (sources.includes("ffz")) {
        await fetchFFZToArchive(archive, channelLogin, includeGlobal, format);
      }
      if (sources.includes("twitch")) {
        await fetchTwitchSubEmotesToArchive(
          archive,
          twitchUser.id,
          process.env.TWITCH_CLIENT_ID,
          process.env.TWITCH_CLIENT_SECRET,
          tier,
          format
        );
      }
    } catch (err) {
      console.error("Archive build error:", err);
    } finally {
      archive.finalize();
    }
  })();

  return new Response(Readable.toWeb(passThrough), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="emotes-${channelLogin}.zip"`,
    },
  });
}
