// Core emote-fetching logic shared by both API routes.
//
// Split into two layers:
//   - list*()      resolves emote metadata (name/url/tier/animated) only.
//                   no image bytes are downloaded. Used by /api/preview.
//   - fetch*ToArchive()  calls the matching list*() then downloads and
//                   appends each file into an in-progress zip. Used by
//                   /api/download. Nothing touches disk in either case.

const CONTENT_TYPE_EXT = {
  "image/gif": "gif",
  "image/png": "png",
  "image/apng": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

export function resolveExtension(guessedExt, contentType) {
  const normalized = (contentType || "").split(";")[0].trim().toLowerCase();
  return CONTENT_TYPE_EXT[normalized] || guessedExt;
}

export function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

// Ballpark medians observed across typical Twitch emote CDNs, not a
// guarantee. Preview never downloads image bytes (that's the entire reason
// list*() and fetch*ToArchive() are split, see the module header), so an
// estimate is the best we can offer before a real download starts.
const AVG_BYTES_ANIMATED = 60 * 1024;
const AVG_BYTES_STATIC = 8 * 1024;

export function estimateTotalBytes(emotes) {
  return emotes.reduce((sum, e) => sum + (e.animated ? AVG_BYTES_ANIMATED : AVG_BYTES_STATIC), 0);
}

// formatFilter is one of: "both", "gif" (animated only), "png" (static only)
export function isFormatAllowed(isAnimated, formatFilter) {
  if (formatFilter === "gif") return isAnimated;
  if (formatFilter === "png") return !isAnimated;
  return true;
}

export function extractChannelName(input) {
  let name = String(input || "").trim();
  try {
    if (name.includes("twitch.tv")) {
      const url = new URL(name.startsWith("http") ? name : `https://${name}`);
      name = url.pathname.split("/").filter(Boolean)[0] || name;
    }
  } catch {}
  return name.replace(/^@/, "").toLowerCase().trim();
}

export async function resolveTwitchId(login) {
  const res = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(login)}`);
  if (!res.ok) throw new Error(`Could not resolve channel "${login}" (HTTP ${res.status})`);
  const data = await res.json();
  const user = Array.isArray(data) ? data[0] : data;
  if (!user || !user.id) throw new Error(`Channel "${login}" not found on Twitch.`);
  return { id: user.id, displayName: user.displayName || login };
}

// Runs `fn` over `items` with at most `limit` in flight at once.
// `fn` must resolve to { ok: true } or { ok: false, source, name, reason }.
// Returns aggregate counts plus the full list of failures, so a caller can
// report exactly which emotes were dropped instead of just how many.
async function mapWithConcurrency(items, limit, fn) {
  let index = 0;
  let successCount = 0;
  const failures = [];
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      const result = await fn(item);
      if (result.ok) successCount++;
      else failures.push(result);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return { successCount, failures, total: items.length };
}

async function appendFetchedFile(archive, url, folder, baseName, guessedExt, fallbackUrl, source) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ext = resolveExtension(guessedExt, res.headers.get("content-type"));
    const buffer = Buffer.from(await res.arrayBuffer());
    archive.append(buffer, { name: `${folder}/${sanitizeFilename(baseName)}.${ext}` });
    return { ok: true };
  } catch (err) {
    // Retry against the fallback URL (7TV only) before giving up. Only the
    // final attempt's error is reported — reporting every intermediate
    // fallback error too would be noise for the "why did this fail" case
    // this exists to answer.
    if (fallbackUrl) {
      return appendFetchedFile(archive, fallbackUrl, folder, baseName, guessedExt, null, source);
    }
    return { ok: false, source, name: baseName, reason: err.message };
  }
}

// ---------- 7TV ----------
export async function list7TV(twitchId, includeGlobal, formatFilter) {
  const sets = [];
  const userRes = await fetch(`https://7tv.io/v3/users/twitch/${twitchId}`);
  if (userRes.ok) {
    const user = await userRes.json();
    if (user.emote_set?.emotes) sets.push(user.emote_set.emotes);
  }
  if (includeGlobal) {
    const gRes = await fetch(`https://7tv.io/v3/emote-sets/global`);
    if (gRes.ok) {
      const g = await gRes.json();
      if (g.emotes) sets.push(g.emotes);
    }
  }
  return sets
    .flat()
    .filter((e) => isFormatAllowed(!!e.data?.animated, formatFilter))
    .map((e) => {
      const animated = !!e.data?.animated;
      const ext = animated ? "gif" : "png";
      return {
        source: "7tv",
        name: e.name,
        animated,
        ext,
        previewUrl: `https://cdn.7tv.app/emote/${e.id}/2x.${ext}`,
        downloadUrl: `https://cdn.7tv.app/emote/${e.id}/4x.${ext}`,
        downloadFallbackUrl: `https://cdn.7tv.app/emote/${e.id}/3x.${ext}`,
      };
    });
}

export async function fetch7TVToArchive(archive, twitchId, includeGlobal, formatFilter, nameFilter) {
  let emotes = await list7TV(twitchId, includeGlobal, formatFilter);
  if (nameFilter) emotes = emotes.filter((e) => nameFilter.has(e.name));
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "7tv", e.name, e.ext, e.downloadFallbackUrl, e.source)
  );
}

// ---------- BTTV ----------
export async function listBTTV(twitchId, includeGlobal, formatFilter) {
  const emotes = [];
  const res = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${twitchId}`);
  if (res.ok) {
    const data = await res.json();
    emotes.push(...(data.channelEmotes || []), ...(data.sharedEmotes || []));
  }
  if (includeGlobal) {
    const gRes = await fetch(`https://api.betterttv.net/3/cached/emotes/global`);
    if (gRes.ok) emotes.push(...(await gRes.json()));
  }
  return emotes
    .filter((e) => isFormatAllowed((e.imageType || "png") === "gif", formatFilter))
    .map((e) => {
      const ext = e.imageType || "png";
      return {
        source: "bttv",
        name: e.code,
        animated: ext === "gif",
        ext,
        previewUrl: `https://cdn.betterttv.net/emote/${e.id}/2x.${ext}`,
        downloadUrl: `https://cdn.betterttv.net/emote/${e.id}/3x.${ext}`,
      };
    });
}

export async function fetchBTTVToArchive(archive, twitchId, includeGlobal, formatFilter, nameFilter) {
  let emotes = await listBTTV(twitchId, includeGlobal, formatFilter);
  if (nameFilter) emotes = emotes.filter((e) => nameFilter.has(e.name));
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "bttv", e.name, e.ext, undefined, e.source)
  );
}

// ---------- FFZ ----------
export async function listFFZ(channelLogin, includeGlobal, formatFilter) {
  const emotes = [];
  const res = await fetch(`https://api.frankerfacez.com/v1/room/${encodeURIComponent(channelLogin)}`);
  if (res.ok) {
    const data = await res.json();
    for (const setId of Object.keys(data.sets || {})) emotes.push(...(data.sets[setId].emoticons || []));
  }
  if (includeGlobal) {
    const gRes = await fetch(`https://api.frankerfacez.com/v1/set/global`);
    if (gRes.ok) {
      const g = await gRes.json();
      for (const setId of Object.keys(g.sets || {})) emotes.push(...(g.sets[setId].emoticons || []));
    }
  }
  return emotes
    .filter((e) => isFormatAllowed(!!e.animated, formatFilter))
    .map((e) => {
      const isAnimated = !!e.animated;
      const urlMap = e.animated || e.urls;
      const bestKey = ["4", "2", "1"].find((k) => urlMap && urlMap[k]);
      if (!bestKey) return null;
      let url = urlMap[bestKey];
      if (url.startsWith("//")) url = "https:" + url;
      const previewKey = ["2", "1", "4"].find((k) => urlMap[k]);
      let previewUrl = urlMap[previewKey] || url;
      if (previewUrl.startsWith("//")) previewUrl = "https:" + previewUrl;
      const ext = isAnimated ? "gif" : new URL(url).pathname.split(".").pop() || "png";
      return { source: "ffz", name: e.name, animated: isAnimated, ext, previewUrl, downloadUrl: url };
    })
    .filter(Boolean);
}

export async function fetchFFZToArchive(archive, channelLogin, includeGlobal, formatFilter, nameFilter) {
  let emotes = await listFFZ(channelLogin, includeGlobal, formatFilter);
  if (nameFilter) emotes = emotes.filter((e) => nameFilter.has(e.name));
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "ffz", e.name, e.ext, undefined, e.source)
  );
}

// ---------- Twitch native subscriber emotes ----------
// Module-scope cache: survives for the lifetime of a warm serverless
// instance. Worst case on a cold start is one extra token request, same as
// before this cache existed — this is a pure optimization, never a
// correctness dependency, so it's safe under Vercel's multi-instance model.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getTwitchAppToken(clientId, clientSecret) {
  const now = Date.now();
  // 60s safety margin so a token doesn't expire mid-request.
  if (cachedToken && now < cachedTokenExpiresAt - 60_000) return cachedToken;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Twitch auth failed (HTTP ${res.status})`);
  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + data.expires_in * 1000;
  return cachedToken;
}

async function fetchRawTwitchChannelEmotes(broadcasterId, clientId, clientSecret) {
  const token = await getTwitchAppToken(clientId, clientSecret);
  const res = await fetch(`https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${broadcasterId}`, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Twitch emotes lookup failed (HTTP ${res.status})`);
  const { data } = await res.json();
  return data;
}

function mapRawTwitchEmote(e) {
  const animated = (e.format || []).includes("animated");
  const ext = animated ? "gif" : "png";
  const formatWord = animated ? "animated" : "static";
  const tierLabel = e.tier ? `_tier${e.tier[0]}` : "";
  const url = `https://static-cdn.jtvnw.net/emoticons/v2/${e.id}/${formatWord}/dark/3.0`;
  const previewUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${e.id}/${formatWord}/dark/2.0`;
  return { name: `${e.name}${tierLabel}`, tier: e.tier, animated, ext, previewUrl, downloadUrl: url };
}

export async function listTwitchSubEmotes(broadcasterId, clientId, clientSecret, tierFilter, formatFilter) {
  const data = await fetchRawTwitchChannelEmotes(broadcasterId, clientId, clientSecret);

  // Raw tier breakdown before any filtering. Lets the preview UI show
  // "found 12 tier1 / 4 tier2 / 2 tier3" so you can verify against Twitch's
  // own dashboard, independent of whatever tier/format filter is applied.
  const rawSubEmotes = data.filter((e) => e.emote_type === "subscriptions");
  const tierCounts = { 1000: 0, 2000: 0, 3000: 0 };
  for (const e of rawSubEmotes) {
    if (e.tier && tierCounts[e.tier] !== undefined) tierCounts[e.tier]++;
  }

  const emotes = rawSubEmotes
    .filter((e) => {
      if (tierFilter !== "all" && e.tier !== tierFilter) return false;
      const animated = (e.format || []).includes("animated");
      return isFormatAllowed(animated, formatFilter);
    })
    .map((e) => ({ source: "twitch", ...mapRawTwitchEmote(e) }));

  return { emotes, tierCounts, rawTotal: rawSubEmotes.length };
}

export async function fetchTwitchSubEmotesToArchive(
  archive,
  broadcasterId,
  clientId,
  clientSecret,
  tierFilter,
  formatFilter,
  nameFilter
) {
  const { emotes: rawEmotes } = await listTwitchSubEmotes(
    broadcasterId,
    clientId,
    clientSecret,
    tierFilter,
    formatFilter
  );
  const emotes = nameFilter ? rawEmotes.filter((e) => nameFilter.has(e.name)) : rawEmotes;
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "twitch-sub-emotes", e.name, e.ext, undefined, e.source)
  );
}

// ---------- Twitch follower emotes ----------
// Same endpoint as subscriber emotes (Twitch returns all custom emote types
// in one response), just a different emote_type filter. Twitch stopped
// letting most channels ADD new follower emotes around 2023, so an empty
// result here is common and expected, not a bug — the UI copy says so.
export async function listTwitchFollowerEmotes(broadcasterId, clientId, clientSecret, formatFilter) {
  const data = await fetchRawTwitchChannelEmotes(broadcasterId, clientId, clientSecret);
  const raw = data.filter((e) => e.emote_type === "follower");
  const emotes = raw
    .filter((e) => isFormatAllowed((e.format || []).includes("animated"), formatFilter))
    .map((e) => ({ source: "twitch-follower", ...mapRawTwitchEmote(e) }));
  return { emotes, rawTotal: raw.length };
}

export async function fetchTwitchFollowerEmotesToArchive(
  archive,
  broadcasterId,
  clientId,
  clientSecret,
  formatFilter,
  nameFilter
) {
  const { emotes: rawEmotes } = await listTwitchFollowerEmotes(broadcasterId, clientId, clientSecret, formatFilter);
  const emotes = nameFilter ? rawEmotes.filter((e) => nameFilter.has(e.name)) : rawEmotes;
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "twitch-follower-emotes", e.name, e.ext, undefined, e.source)
  );
}

// ---------- Twitch Bits/cheer tier emotes ----------
// Unlocked by cheering a set amount of Bits in the channel, distinct from
// Cheermotes (the animated "Cheer100"-style icons) - this is the same
// custom-emote family as sub/follower emotes, just gated by Bits instead.
export async function listTwitchBitsEmotes(broadcasterId, clientId, clientSecret, formatFilter) {
  const data = await fetchRawTwitchChannelEmotes(broadcasterId, clientId, clientSecret);
  const raw = data.filter((e) => e.emote_type === "bitstier");
  const emotes = raw
    .filter((e) => isFormatAllowed((e.format || []).includes("animated"), formatFilter))
    .map((e) => ({ source: "twitch-bits", ...mapRawTwitchEmote(e) }));
  return { emotes, rawTotal: raw.length };
}

export async function fetchTwitchBitsEmotesToArchive(
  archive,
  broadcasterId,
  clientId,
  clientSecret,
  formatFilter,
  nameFilter
) {
  const { emotes: rawEmotes } = await listTwitchBitsEmotes(broadcasterId, clientId, clientSecret, formatFilter);
  const emotes = nameFilter ? rawEmotes.filter((e) => nameFilter.has(e.name)) : rawEmotes;
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "twitch-bits-emotes", e.name, e.ext, undefined, e.source)
  );
}

// ---------- Twitch subscriber loyalty badges ----------
// A DIFFERENT endpoint (chat/badges, not chat/emotes) and — per Twitch's
// developer forum — this one has historically required a user access token
// rather than an app access token, unlike every other source in this file.
// This deployment only ever has an app token (client_credentials, no login
// flow exists anywhere in this app). If Twitch still enforces that
// restriction, this will fail with a 401 here, which the caller already
// surfaces as a normal per-source error rather than crashing anything else -
// this is deliberately shipped best-effort rather than blocked on
// confirming Twitch's current policy.
export async function listTwitchBadges(broadcasterId, clientId, clientSecret) {
  const token = await getTwitchAppToken(clientId, clientSecret);
  const res = await fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterId}`, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        "Twitch rejected this request (HTTP 401). This endpoint may require broadcaster authorization that this deployment's app-only credentials don't have."
      );
    }
    throw new Error(`Twitch badges lookup failed (HTTP ${res.status})`);
  }
  const { data } = await res.json();
  const subscriberSet = data.find((set) => set.set_id === "subscriber");
  const versions = subscriberSet ? subscriberSet.versions : [];

  const emotes = versions.map((v) => ({
    source: "twitch-badges",
    name: `subscriber_${v.id}`,
    animated: false,
    ext: "png",
    previewUrl: v.image_url_2x || v.image_url_1x,
    downloadUrl: v.image_url_4x || v.image_url_2x || v.image_url_1x,
  }));

  return { emotes, rawTotal: emotes.length };
}

export async function fetchTwitchBadgesToArchive(archive, broadcasterId, clientId, clientSecret, nameFilter) {
  const { emotes: rawEmotes } = await listTwitchBadges(broadcasterId, clientId, clientSecret);
  const emotes = nameFilter ? rawEmotes.filter((e) => nameFilter.has(e.name)) : rawEmotes;
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "twitch-loyalty-badges", e.name, e.ext, undefined, e.source)
  );
}
