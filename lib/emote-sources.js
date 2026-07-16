// Core emote-fetching logic shared by the API route.
// Unlike the desktop CLI version, nothing touches disk here — every emote is
// fetched into memory and appended directly to an in-progress zip archive,
// so this can run inside a stateless serverless function.

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

async function appendFetchedFile(archive, url, folder, baseName, guessedExt) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ext = resolveExtension(guessedExt, res.headers.get("content-type"));
    const buffer = Buffer.from(await res.arrayBuffer());
    archive.append(buffer, { name: `${folder}/${sanitizeFilename(baseName)}.${ext}` });
    return true;
  } catch {
    return false;
  }
}

// ---------- 7TV ----------
export async function fetch7TVToArchive(archive, twitchId, includeGlobal, formatFilter) {
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
  const emotes = sets.flat().filter((e) => isFormatAllowed(!!e.data?.animated, formatFilter));

  return mapWithConcurrency(emotes, 8, async (e) => {
    const animated = !!e.data?.animated;
    const ext = animated ? "gif" : "png";
    const ok = await appendFetchedFile(archive, `https://cdn.7tv.app/emote/${e.id}/4x.${ext}`, "7tv", e.name, ext);
    if (ok) return true;
    return appendFetchedFile(archive, `https://cdn.7tv.app/emote/${e.id}/3x.${ext}`, "7tv", e.name, ext);
  });
}

// ---------- BTTV ----------
export async function fetchBTTVToArchive(archive, twitchId, includeGlobal, formatFilter) {
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
  const filtered = emotes.filter((e) => isFormatAllowed((e.imageType || "png") === "gif", formatFilter));

  return mapWithConcurrency(filtered, 8, async (e) => {
    const ext = e.imageType || "png";
    return appendFetchedFile(archive, `https://cdn.betterttv.net/emote/${e.id}/3x.${ext}`, "bttv", e.code, ext);
  });
}

// ---------- FFZ ----------
export async function fetchFFZToArchive(archive, channelLogin, includeGlobal, formatFilter) {
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
  const filtered = emotes.filter((e) => isFormatAllowed(!!e.animated, formatFilter));

  return mapWithConcurrency(filtered, 8, async (e) => {
    const isAnimated = !!e.animated;
    const urlMap = e.animated || e.urls;
    const bestKey = ["4", "2", "1"].find((k) => urlMap && urlMap[k]);
    if (!bestKey) return false;
    let url = urlMap[bestKey];
    if (url.startsWith("//")) url = "https:" + url;
    const guessedExt = isAnimated ? "gif" : (new URL(url).pathname.split(".").pop() || "png");
    return appendFetchedFile(archive, url, "ffz", e.name, guessedExt);
  });
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

export async function fetchTwitchSubEmotesToArchive(archive, broadcasterId, clientId, clientSecret, tierFilter, formatFilter) {
  const token = await getTwitchAppToken(clientId, clientSecret);
  const res = await fetch(`https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${broadcasterId}`, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Twitch emotes lookup failed (HTTP ${res.status})`);
  const { data } = await res.json();

  const filtered = data.filter((e) => {
    if (e.emote_type !== "subscriptions") return false;
    if (tierFilter !== "all" && e.tier !== tierFilter) return false;
    const animated = (e.format || []).includes("animated");
    return isFormatAllowed(animated, formatFilter);
  });

  return mapWithConcurrency(filtered, 8, async (e) => {
    const animated = (e.format || []).includes("animated");
    const ext = animated ? "gif" : "png";
    const formatWord = animated ? "animated" : "static";
    const url = `https://static-cdn.jtvnw.net/emoticons/v2/${e.id}/${formatWord}/dark/3.0`;
    const tierLabel = e.tier ? `_tier${e.tier[0]}` : "";
    return appendFetchedFile(archive, url, "twitch-sub-emotes", `${e.name}${tierLabel}`, ext);
  });
}
