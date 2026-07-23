"use client";

import { useState, useRef, useCallback } from "react";
import JSZip from "jszip";
import { FAQ_ITEMS } from "@/lib/content";

const SOURCE_OPTIONS = [
  { id: "7tv", label: "7TV", hint: "Community overlay emotes, usually GIF" },
  { id: "bttv", label: "BTTV", hint: "BetterTTV overlay emotes" },
  { id: "ffz", label: "FrankerFaceZ", hint: "FFZ overlay emotes" },
  { id: "twitch", label: "Twitch Emotes", hint: "Subscriber, follower, and Bits emotes, plus loyalty badges" },
];

const SOURCE_LABELS = {
  "7tv": "7TV",
  bttv: "BTTV",
  ffz: "FrankerFaceZ",
  twitch: "Twitch Subscriber Emotes",
  "twitch-follower": "Twitch Follower Emotes",
  "twitch-bits": "Twitch Bits/Cheer Emotes",
  "twitch-badges": "Subscriber Loyalty Badges",
  "twitch-cheer-badges": "Cheer Badges",
  "twitch-cheermotes": "Cheermotes",
};

// Sub-options revealed once the "Twitch Emotes" checkbox is on. Kept
// separate from SOURCE_OPTIONS because these map to a source id
// (twitchCategories.subscriber -> the "twitch" source id) rather than being
// their own top-level source id 1:1 - see buildSelectedSources(). All
// default to checked: checking "Twitch Emotes" gets you everything Twitch
// has by default, rather than making you hunt down and check six boxes one
// at a time. Uncheck individual ones here if you don't want them.
const TWITCH_CATEGORY_OPTIONS = [
  { key: "subscriber", label: "Subscriber Emotes", hint: "Real sub emotes, filterable by tier" },
  {
    key: "follower",
    label: "Follower Emotes",
    hint: "Most channels no longer have any — Twitch restricted new ones in 2023",
  },
  { key: "bits", label: "Bits/Cheer Emotes", hint: "Unlocked by cheering Bits" },
  { key: "cheermotes", label: "Cheermotes", hint: "The animated Cheer100/Cheer1000-style icons used when cheering" },
  { key: "badges", label: "Subscriber Loyalty Badges", hint: "May not work on every deployment — see FAQ" },
  { key: "cheerBadges", label: "Cheer Badges", hint: "Bits-tier badges. Same caveat as loyalty badges — see FAQ" },
];

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Page() {
  const [channel, setChannel] = useState("");
  const [sources, setSources] = useState({ "7tv": true, bttv: true, ffz: true, twitch: false });
  const [twitchCategories, setTwitchCategories] = useState({
    subscriber: true,
    follower: true,
    bits: true,
    cheermotes: true,
    badges: true,
    cheerBadges: true,
  });
  const [includeGlobal, setIncludeGlobal] = useState(false);
  const [format, setFormat] = useState("both");
  const [tier, setTier] = useState("all");
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [lastFailures, setLastFailures] = useState([]);
  const [retryBusy, setRetryBusy] = useState(false);
  const logRef = useRef(null);
  const wrapRef = useRef(null);

  // Real pointer-tracked 3D tilt on the cartridge panel: the rotation is
  // derived from actual cursor position, not a canned CSS animation.
  const handlePointerMove = useCallback((e) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const maxTilt = 4;
    el.style.transform = `perspective(1600px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg)`;
  }, []);

  const handlePointerLeave = useCallback(() => {
    const el = wrapRef.current;
    if (el) el.style.transform = "perspective(1600px) rotateX(0deg) rotateY(0deg)";
  }, []);

  function pushLine(text, kind = "idle") {
    setLog((prev) => [...prev.slice(-200), { text, kind }]);
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }

  function toggleSource(id) {
    setSources((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Reads/writes the theme directly on the DOM rather than through React
  // state, so there's nothing for server and client renders to disagree
  // about (the icon's visibility is pure CSS, keyed off the data-theme
  // attribute - see globals.css). The attribute itself is first set before
  // hydration by the inline script in layout.js, so there's no flash.
  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    html.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing / storage disabled: theme still applies for this
      // page load via the DOM attribute, it just won't persist next visit.
    }
  }

  function toggleTwitchCategory(key) {
    setTwitchCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Expands the single "Twitch Emotes" checkbox into the actual source ids
  // the API expects, based on which sub-categories are checked. Every
  // other source id passes straight through unchanged.
  function buildSelectedSources() {
    const selected = Object.entries(sources)
      .filter(([id, checked]) => checked && id !== "twitch")
      .map(([id]) => id);
    if (sources.twitch) {
      if (twitchCategories.subscriber) selected.push("twitch");
      if (twitchCategories.follower) selected.push("twitch-follower");
      if (twitchCategories.bits) selected.push("twitch-bits");
      if (twitchCategories.cheermotes) selected.push("twitch-cheermotes");
      if (twitchCategories.badges) selected.push("twitch-badges");
      if (twitchCategories.cheerBadges) selected.push("twitch-cheer-badges");
    }
    return selected;
  }

  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Derived, not stored: only meaningful once a preview estimate exists for
  // roughly the current request. Clamped because the estimate is a
  // heuristic (see estimateTotalBytes) and real bytes can exceed it.
  const progressPercent =
    preview && preview.estimatedBytes > 0
      ? Math.min(100, Math.round((bytesReceived / preview.estimatedBytes) * 100))
      : null;
  const [visibleCounts, setVisibleCounts] = useState({});
  const [previewSearch, setPreviewSearch] = useState("");
  const PAGE_SIZE = 30;

  async function handlePreview() {
    setPreviewError("");
    const selected = buildSelectedSources();
    if (!channel.trim()) {
      setPreviewError("Enter a channel name or URL first.");
      return;
    }
    if (selected.length === 0) {
      setPreviewError("Pick at least one emote source first.");
      return;
    }

    setPreviewBusy(true);
    setPreview(null);
    setVisibleCounts({});
    setPreviewSearch("");
    try {
      const headers = { "Content-Type": "application/json" };
      if (accessCode) headers["x-access-code"] = accessCode;

      const res = await fetch("/api/preview", {
        method: "POST",
        headers,
        body: JSON.stringify({ channel: channel.trim(), sources: selected, includeGlobal, format, tier }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || `Request failed (HTTP ${res.status})`);
      setPreview(payload);
      const initialCounts = {};
      for (const sourceId of Object.keys(payload.sources)) initialCounts[sourceId] = PAGE_SIZE;
      setVisibleCounts(initialCounts);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewBusy(false);
    }
  }

  function loadMore(sourceId) {
    setVisibleCounts((prev) => ({ ...prev, [sourceId]: (prev[sourceId] || PAGE_SIZE) + PAGE_SIZE }));
  }

  // Shared by both a normal download and a "retry failed emotes" pass -
  // same streaming/report-parsing logic either way, just a different
  // request body. Keeping one implementation avoids the two drifting apart,
  // the same reasoning as preview/download parity (ADR-004).
  async function runDownload(requestBody, { isRetry = false, busySetter = setBusy, detailLine } = {}) {
    busySetter(true);
    setBytesReceived(0);
    if (!isRetry) setLog([]);
    pushLine(
      isRetry
        ? `$ retrying ${requestBody.retryOnly ? "failed emotes" : "download"}...`
        : `$ fetching emotes for "${requestBody.channel}"`,
      "idle"
    );
    if (detailLine) pushLine(detailLine, "idle");

    try {
      const headers = { "Content-Type": "application/json" };
      if (accessCode) headers["x-access-code"] = accessCode;

      const res = await fetch("/api/download", { method: "POST", headers, body: JSON.stringify(requestBody) });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `Request failed (HTTP ${res.status})`);
      }

      pushLine("connected, streaming zip...", "ok");

      const reader = res.body.getReader();
      const chunks = [];
      let total = 0;
      let lastLogged = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.length;
        setBytesReceived(total);
        if (total - lastLogged > 40_000) {
          pushLine(`+${formatBytes(total - lastLogged)} received (${formatBytes(total)} total)`, "idle");
          lastLogged = total;
        }
      }

      const blob = new Blob(chunks, { type: "application/zip" });
      const filename = `emotes-${requestBody.channel
        .replace(/^https?:\/\/(www\.)?twitch\.tv\//, "")
        .replace(/[^a-z0-9_-]/gi, "_")}${isRetry ? "-retry" : ""}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      pushLine(`done: ${formatBytes(total)} saved as ${filename}`, "ok");

      // Read the real report out of the zip we just built, instead of only
      // pointing the user at a file they'd have to open themselves (the
      // gap ADR-005 flagged as a follow-up).
      try {
        const zip = await JSZip.loadAsync(blob);
        const reportEntry = zip.file("download-report.json");
        if (reportEntry) {
          const report = JSON.parse(await reportEntry.async("string"));
          const totalDownloaded = Object.values(report.sources || {}).reduce((n, s) => n + s.downloaded, 0);
          const totalFailed = (report.failures || []).length;
          pushLine(`${totalDownloaded} emote${totalDownloaded === 1 ? "" : "s"} downloaded`, "ok");
          if (totalFailed > 0) {
            pushLine(`${totalFailed} emote${totalFailed === 1 ? "" : "s"} failed — see the Retry button below`, "err");
          } else if (isRetry) {
            pushLine("all previously failed emotes succeeded this time", "ok");
          }
          setLastFailures(report.failures || []);
        }
      } catch (parseErr) {
        // Non-fatal: the zip already downloaded successfully, we just
        // couldn't read our own report back out of it client-side. Fall
        // back to the old pointer text rather than losing the info entirely.
        console.error("Could not parse download-report.json:", parseErr);
        pushLine("see download-report.json inside the zip for a per-source summary", "idle");
      }
    } catch (err) {
      pushLine(`error: ${err.message}`, "err");
      setError(err.message);
    } finally {
      busySetter(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const selected = buildSelectedSources();
    if (!channel.trim()) {
      setError("Enter a channel name or URL.");
      return;
    }
    if (selected.length === 0) {
      setError("Pick at least one emote source.");
      return;
    }

    setLastFailures([]);
    await runDownload(
      { channel: channel.trim(), sources: selected, includeGlobal, format, tier },
      {
        detailLine: `sources: ${selected.join(", ")} | format: ${format}${selected.includes("twitch") ? ` | tier: ${tier}` : ""}`,
      }
    );
  }

  async function handleRetry() {
    if (lastFailures.length === 0) return;
    const retryOnly = {};
    for (const f of lastFailures) {
      (retryOnly[f.source] ||= []).push(f.name);
    }
    const selected = Object.keys(retryOnly);
    await runDownload(
      { channel: channel.trim(), sources: selected, includeGlobal, format, tier, retryOnly },
      { isRetry: true, busySetter: setRetryBusy }
    );
  }

  return (
    <>
      <a className="skip-link" href="#top">
        Skip to content
      </a>
      <nav className="topnav" aria-label="Primary">
        <a className="topnav-brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark-arrow">↓</span>
          </span>
          <span className="brand-wordmark">EMOTE//GRABBER</span>
        </a>
        <div className="topnav-links">
          <a href="#form">Get emotes</a>
          <a href="#faq">FAQ</a>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Switch between light and dark theme"
          >
            <span className="theme-icon-dark">🌙</span>
            <span className="theme-icon-light">☀️</span>
          </button>
        </div>
      </nav>

      <main className="page" id="top">
        <header className="hero-row hero-row-compact">
          <span className="eyebrow">7TV · BTTV · FFZ · TWITCH</span>
          <h1>
            Download. <span className="accent">Organize.</span>
            <br />
            Every <span className="accent-alt">emote.</span>
          </h1>
          <p className="subtitle">
            Type a channel, pick your sources and formats, hit the button. Runs server-side, so nothing touches your
            browser except the finished zip.
          </p>
          <a className="hero-cta-primary" href="#form">
            Get emotes
          </a>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <section className="section section-tight" aria-labelledby="form-heading">
          <h2 id="form-heading">Get emotes</h2>
          <div
            className="cartridge-wrap"
            ref={wrapRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            id="form"
          >
            <form className="grid" onSubmit={handleSubmit}>
              <div className="card">
                <div className="field">
                  <label className="field-label" htmlFor="channel">
                    Channel name or URL
                  </label>
                  <input
                    id="channel"
                    type="text"
                    placeholder="xqc or https://www.twitch.tv/xqc"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="field">
                  <span className="field-label">Sources</span>
                  <div className="check-grid">
                    {SOURCE_OPTIONS.map((opt) => (
                      <label className="check-row" key={opt.id}>
                        <input type="checkbox" checked={!!sources[opt.id]} onChange={() => toggleSource(opt.id)} />
                        <div>
                          <div className="label">{opt.label}</div>
                          <div className="hint">{opt.hint}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {sources.twitch && (
                    <div className="twitch-subgrid">
                      {TWITCH_CATEGORY_OPTIONS.map((opt) => (
                        <label className="check-row" key={opt.key}>
                          <input
                            type="checkbox"
                            checked={!!twitchCategories[opt.key]}
                            onChange={() => toggleTwitchCategory(opt.key)}
                          />
                          <div>
                            <div className="label">{opt.label}</div>
                            <div className="hint">{opt.hint}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {sources.twitch && twitchCategories.subscriber && (
                  <div className="field">
                    <label className="field-label" htmlFor="tier">
                      Subscriber emote tier
                    </label>
                    <select id="tier" value={tier} onChange={(e) => setTier(e.target.value)}>
                      <option value="all">All tiers</option>
                      <option value="1000">Tier 1 only</option>
                      <option value="2000">Tier 2 only</option>
                      <option value="3000">Tier 3 only</option>
                    </select>
                  </div>
                )}

                <div className="field">
                  <span className="field-label">Format</span>
                  <div className="radio-row">
                    <label className="radio-pill">
                      <input
                        type="radio"
                        name="format"
                        checked={format === "both"}
                        onChange={() => setFormat("both")}
                      />
                      Both (mix)
                    </label>
                    <label className="radio-pill">
                      <input type="radio" name="format" checked={format === "gif"} onChange={() => setFormat("gif")} />
                      GIF only
                    </label>
                    <label className="radio-pill">
                      <input type="radio" name="format" checked={format === "png"} onChange={() => setFormat("png")} />
                      PNG only
                    </label>
                  </div>
                </div>

                <div className="field">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={includeGlobal}
                      onChange={(e) => setIncludeGlobal(e.target.checked)}
                    />
                    Include each platform&apos;s global emote set too
                  </label>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="accessCode">
                    Access code <span className="field-label-note">(only if this deployment has one set)</span>
                  </label>
                  <input
                    id="accessCode"
                    type="password"
                    placeholder="leave blank if none"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="field button-row">
                  <button type="button" className="preview-btn" onClick={handlePreview} disabled={previewBusy}>
                    {previewBusy ? "Loading..." : "👁 Preview"}
                  </button>
                  <button className="submit" type="submit" disabled={busy}>
                    {busy ? "Building zip..." : "Download zip"}
                  </button>
                </div>
                {previewError && <p className="preview-error">{previewError}</p>}
                {/* Estimate only exists once Preview has run for the current selection — it's
                a heuristic (see estimateTotalBytes in lib/emote-sources.js), not a real
                measurement, so it's worded as "~" rather than an exact figure. */}
                {!busy && preview && preview.estimatedBytes > 0 && (
                  <p className="size-estimate">
                    ~{formatBytes(preview.estimatedBytes)} estimated for the current filters
                  </p>
                )}

                <p className="footnote">
                  By downloading, you confirm you have the right to these files and agree to our{" "}
                  <a href="/legal">Terms</a>.
                </p>
              </div>

              <div className="terminal">
                <div className="terminal-bar">
                  <span className="terminal-dot" />
                  <span className="terminal-dot" />
                  <span className="terminal-dot" />
                  <span className="terminal-title">stream.log</span>
                </div>
                <div className="terminal-body" ref={logRef}>
                  {log.length === 0 && <div className="line-idle">Waiting for a request...</div>}
                  {log.map((line, i) => (
                    <div key={i} className={`line-${line.kind}`}>
                      {line.text}
                    </div>
                  ))}
                </div>
                {log.length > 0 && (
                  <div className="terminal-stat">
                    <span>received</span>
                    <span>{formatBytes(bytesReceived)}</span>
                    {progressPercent !== null && <span>{progressPercent}%</span>}
                  </div>
                )}
                {busy && (
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Download progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent ?? undefined}
                  >
                    {/* When there's no preview-derived estimate to measure against, fall back
                    to an indeterminate sweep instead of a bar stuck at 0% the whole time —
                    still gated on prefers-reduced-motion via the .indeterminate CSS rule. */}
                    <div
                      className={`progress-fill${progressPercent === null ? " indeterminate" : ""}`}
                      style={progressPercent === null ? undefined : { width: `${progressPercent}%` }}
                    />
                  </div>
                )}
                {lastFailures.length > 0 && !busy && (
                  <div className="retry-banner">
                    <span>
                      {lastFailures.length} emote{lastFailures.length === 1 ? "" : "s"} failed to download last time.
                    </span>
                    <button type="button" className="retry-btn" onClick={handleRetry} disabled={retryBusy}>
                      {retryBusy ? "Retrying..." : "Retry failed"}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </section>

        {preview && (
          <section className="preview-panel">
            <div className="preview-panel-head">
              <h2>Preview: {preview.displayName}</h2>
              <button type="button" className="preview-close" onClick={() => setPreview(null)}>
                ✕ close
              </button>
            </div>

            {Object.values(preview.sources).every((d) => !d.error && d.total === 0) && (
              <p className="preview-empty">
                This channel doesn&apos;t have emotes on any of the sources you picked. There&apos;s nothing to preview
                or download here.
              </p>
            )}

            {Object.values(preview.sources).some((d) => d.total > 0) && (
              <div className="field preview-search-field">
                <input
                  type="text"
                  className="preview-search"
                  placeholder="Search by emote name..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  aria-label="Search emotes by name"
                />
              </div>
            )}

            {Object.entries(preview.sources).map(([sourceId, data]) => {
              const label = SOURCE_LABELS[sourceId] || sourceId;
              if (data.error) {
                return (
                  <div className="preview-source" key={sourceId}>
                    <h3>{label}</h3>
                    <p className="preview-error">{data.error}</p>
                  </div>
                );
              }
              // This channel simply doesn't use this platform: skip the
              // section entirely instead of showing an empty "0 emotes" block.
              if (data.total === 0) return null;

              const query = previewSearch.trim().toLowerCase();
              const filteredItems = query
                ? data.items.filter((item) => item.name.toLowerCase().includes(query))
                : data.items;

              // A source with matches elsewhere but none for this search
              // term shouldn't clutter the panel with an empty card.
              if (query && filteredItems.length === 0) return null;

              return (
                <div className="preview-source" key={sourceId}>
                  <h3>
                    {label}: {query ? `${filteredItems.length} of ${data.total}` : data.total} emote
                    {data.total === 1 ? "" : "s"}
                  </h3>
                  {sourceId === "twitch" && data.tierCounts && !query && (
                    <p className="tier-breakdown">
                      Tier 1: {data.tierCounts["1000"]} · Tier 2: {data.tierCounts["2000"]} · Tier 3:{" "}
                      {data.tierCounts["3000"]} (raw total before filters: {data.rawTotal})
                    </p>
                  )}
                  {filteredItems.length === 0 ? (
                    <p className="preview-empty">No emotes matched. Nothing to show here.</p>
                  ) : (
                    <>
                      <div className="preview-grid">
                        {filteredItems.slice(0, visibleCounts[sourceId] || PAGE_SIZE).map((item, i) => (
                          <div className="preview-tile" key={`${sourceId}-${i}`} title={item.name}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.previewUrl} alt={item.name} loading="lazy" />
                            {item.tier && <span className="preview-tier-badge">T{item.tier[0]}</span>}
                            <span className="preview-tile-name">{item.name}</span>
                          </div>
                        ))}
                      </div>
                      {(visibleCounts[sourceId] || PAGE_SIZE) < filteredItems.length ? (
                        <button type="button" className="load-more-btn" onClick={() => loadMore(sourceId)}>
                          Load more ({filteredItems.length - (visibleCounts[sourceId] || PAGE_SIZE)} remaining)
                        </button>
                      ) : (
                        filteredItems.length > PAGE_SIZE && (
                          <p className="all-loaded">All {filteredItems.length} loaded</p>
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </section>
        )}

        <section className="section" id="faq" aria-labelledby="faq-heading">
          <h2 id="faq-heading">FAQ</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <details className="faq-item" key={i}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="site-footer">
          <div className="footer-top">
            <span>emote-grabber: 7TV / BTTV / FFZ / Twitch</span>
            <div className="footer-links">
              <a href="/legal">Terms · Privacy · Copyright</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
