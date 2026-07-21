import {
  extractChannelName,
  resolveTwitchId,
  list7TV,
  listBTTV,
  listFFZ,
  listTwitchSubEmotes,
  estimateTotalBytes,
} from "@/lib/emote-sources";

export const runtime = "nodejs";
export const maxDuration = 30;

// Safety ceiling only, not a UI page size. The upstream APIs already
// return their full emote list in one call (no pagination exists on their
// end), so we return everything here and let the client reveal it
// incrementally via "Load more". This just guards against a pathological
// channel with an absurd emote count blowing up the response.
const SAFETY_CAP = 3000;

export async function POST(req) {
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

  const result = { channelLogin, displayName: twitchUser.displayName, sources: {} };

  await Promise.all(
    sources.map(async (source) => {
      try {
        if (source === "7tv") {
          const emotes = await list7TV(twitchUser.id, includeGlobal, format);
          result.sources["7tv"] = {
            total: emotes.length,
            items: emotes.slice(0, SAFETY_CAP),
            estimatedBytes: estimateTotalBytes(emotes),
          };
        } else if (source === "bttv") {
          const emotes = await listBTTV(twitchUser.id, includeGlobal, format);
          result.sources.bttv = {
            total: emotes.length,
            items: emotes.slice(0, SAFETY_CAP),
            estimatedBytes: estimateTotalBytes(emotes),
          };
        } else if (source === "ffz") {
          const emotes = await listFFZ(channelLogin, includeGlobal, format);
          result.sources.ffz = {
            total: emotes.length,
            items: emotes.slice(0, SAFETY_CAP),
            estimatedBytes: estimateTotalBytes(emotes),
          };
        } else if (source === "twitch") {
          if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
            result.sources.twitch = {
              total: 0,
              items: [],
              estimatedBytes: 0,
              error: "TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET not set on this deployment.",
            };
            return;
          }
          const { emotes, tierCounts, rawTotal } = await listTwitchSubEmotes(
            twitchUser.id,
            process.env.TWITCH_CLIENT_ID,
            process.env.TWITCH_CLIENT_SECRET,
            tier,
            format
          );
          result.sources.twitch = {
            total: emotes.length,
            items: emotes.slice(0, SAFETY_CAP),
            estimatedBytes: estimateTotalBytes(emotes),
            tierCounts,
            rawTotal,
          };
        }
      } catch (err) {
        result.sources[source] = { total: 0, items: [], error: err.message };
      }
    })
  );

  result.estimatedBytes = Object.values(result.sources).reduce((sum, s) => sum + (s.estimatedBytes || 0), 0);

  return Response.json(result);
}
