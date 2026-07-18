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

function resolveExtension(guessedExt, contentType) {
  const normalized = (contentType || "").split(";")[0].trim().toLowerCase();
  return CONTENT_TYPE_EXT[normalized] || guessedExt;
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
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
// Returns the count of calls that resolved truthy.
async function mapWithConcurrency(items, limit, fn) {
  let index = 0;
  let successCount = 0;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      if (await fn(item)) successCount++;
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return successCount;
}

async function appendFetchedFile(archive, url, folder, baseName, guessedExt, fallbackUrl) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ext = resolveExtension(guessedExt, res.headers.get("content-type"));
    const buffer = Buffer.from(await res.arrayBuffer());
    archive.append(buffer, { name: `${folder}/${sanitizeFilename(baseName)}.${ext}` });
    return true;
  } catch {
    if (!fallbackUrl) return false;
    return appendFetchedFile(archive, fallbackUrl, folder, baseName, guessedExt, null);
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

export async function fetch7TVToArchive(archive, twitchId, includeGlobal, formatFilter) {
  const emotes = await list7TV(twitchId, includeGlobal, formatFilter);
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "7tv", e.name, e.ext, e.downloadFallbackUrl)
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

export async function fetchBTTVToArchive(archive, twitchId, includeGlobal, formatFilter) {
  const emotes = await listBTTV(twitchId, includeGlobal, formatFilter);
  return mapWithConcurrency(emotes, 8, (e) => appendFetchedFile(archive, e.downloadUrl, "bttv", e.name, e.ext));
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

export async function fetchFFZToArchive(archive, channelLogin, includeGlobal, formatFilter) {
  const emotes = await listFFZ(channelLogin, includeGlobal, formatFilter);
  return mapWithConcurrency(emotes, 8, (e) => appendFetchedFile(archive, e.downloadUrl, "ffz", e.name, e.ext));
}

// ---------- Twitch native subscriber emotes ----------
async function getTwitchAppToken(clientId, clientSecret) {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Twitch auth failed (HTTP ${res.status})`);
  const data = await res.json();
  return data.access_token;
}

export async function listTwitchSubEmotes(broadcasterId, clientId, clientSecret, tierFilter, formatFilter) {
  const token = await getTwitchAppToken(clientId, clientSecret);
  const res = await fetch(`https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${broadcasterId}`, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Twitch emotes lookup failed (HTTP ${res.status})`);
  const { data } = await res.json();

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
    .map((e) => {
      const animated = (e.format || []).includes("animated");
      const ext = animated ? "gif" : "png";
      const formatWord = animated ? "animated" : "static";
      const tierLabel = e.tier ? `_tier${e.tier[0]}` : "";
      const url = `https://static-cdn.jtvnw.net/emoticons/v2/${e.id}/${formatWord}/dark/3.0`;
      const previewUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${e.id}/${formatWord}/dark/2.0`;
      return {
        source: "twitch",
        name: `${e.name}${tierLabel}`,
        tier: e.tier,
        animated,
        ext,
        previewUrl,
        downloadUrl: url,
      };
    });

  return { emotes, tierCounts, rawTotal: rawSubEmotes.length };
}

export async function fetchTwitchSubEmotesToArchive(archive, broadcasterId, clientId, clientSecret, tierFilter, formatFilter) {
  const { emotes } = await listTwitchSubEmotes(broadcasterId, clientId, clientSecret, tierFilter, formatFilter);
  return mapWithConcurrency(emotes, 8, (e) =>
    appendFetchedFile(archive, e.downloadUrl, "twitch-sub-emotes", e.name, e.ext)
  );
}
