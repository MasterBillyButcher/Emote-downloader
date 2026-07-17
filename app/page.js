"use client";

import { useState, useRef, useCallback } from "react";
import { STEPS, SOURCE_INFO, FAQ_ITEMS } from "@/lib/content";

const SOURCE_OPTIONS = [
  { id: "7tv", label: "7TV", hint: "Community overlay emotes, usually GIF" },
  { id: "bttv", label: "BTTV", hint: "BetterTTV overlay emotes" },
  { id: "ffz", label: "FrankerFaceZ", hint: "FFZ overlay emotes" },
  { id: "twitch", label: "Twitch Subscriber Emotes", hint: "Real sub emotes, needs a Twitch Dev app on the server" },
];

const SOURCE_LABELS = { "7tv": "7TV", bttv: "BTTV", ffz: "FrankerFaceZ", twitch: "Twitch Subscriber Emotes" };

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Page() {
  const [channel, setChannel] = useState("");
  const [sources, setSources] = useState({ "7tv": true, bttv: true, ffz: true, twitch: false });
  const [includeGlobal, setIncludeGlobal] = useState(false);
  const [format, setFormat] = useState("both");
  const [tier, setTier] = useState("all");
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);
  const [bytesReceived, setBytesReceived] = useState(0);
  const logRef = useRef(null);
  const wrapRef = useRef(null);
  const heroRef = useRef(null);

  // Real pointer-tracked 3D tilt on the cartridge panel — the rotation is
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

  // Same idea for the hero card stack, wider range since it's a decorative
  // showcase rather than a form the user is trying to read.
  const handleHeroPointerMove = useCallback((e) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const maxTilt = 10;
    el.style.transform = `perspective(1200px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg)`;
  }, []);

  const handleHeroPointerLeave = useCallback(() => {
    const el = heroRef.current;
    if (el) el.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
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

  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [visibleCounts, setVisibleCounts] = useState({});
  const PAGE_SIZE = 30;

  async function handlePreview() {
    setPreviewError("");
    const selected = Object.entries(sources).filter(([, v]) => v).map(([k]) => k);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const selected = Object.entries(sources).filter(([, v]) => v).map(([k]) => k);
    if (!channel.trim()) {
      setError("Enter a channel name or URL.");
      return;
    }
    if (selected.length === 0) {
      setError("Pick at least one emote source.");
      return;
    }

    setBusy(true);
    setBytesReceived(0);
    setLog([]);
    pushLine(`$ fetching emotes for "${channel.trim()}"`, "idle");
    pushLine(`sources: ${selected.join(", ")} | format: ${format}${selected.includes("twitch") ? ` | tier: ${tier}` : ""}`, "idle");

    try {
      const headers = { "Content-Type": "application/json" };
      if (accessCode) headers["x-access-code"] = accessCode;

      const res = await fetch("/api/download", {
        method: "POST",
        headers,
        body: JSON.stringify({ channel: channel.trim(), sources: selected, includeGlobal, format, tier }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `Request failed (HTTP ${res.status})`);
      }

      pushLine("connected — streaming zip...", "ok");

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
      const filename = `emotes-${channel.trim().replace(/^https?:\/\/(www\.)?twitch\.tv\//, "").replace(/[^a-z0-9_-]/gi, "_")}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      pushLine(`done — ${formatBytes(total)} saved as ${filename}`, "ok");
    } catch (err) {
      pushLine(`error: ${err.message}`, "err");
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="topnav">
        <a className="topnav-brand" href="#top">
          ◆ EMOTE//GRABBER
        </a>
        <div className="topnav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#sources">Sources</a>
          <a href="#form">Get emotes</a>
          <a href="#faq">FAQ</a>
        </div>
      </nav>

      <main className="page" id="top">
        <header className="hero-row">
          <div>
            <span className="eyebrow">◆ 7TV · BTTV · FFZ · TWITCH CARTRIDGE</span>
            <h1>
              Pop in a channel.
              <br />
              Get every <span className="accent">emote</span>.
            </h1>
            <p className="subtitle">
              Type a channel, pick your sources and formats, hit the button. Runs server-side —
              nothing touches your browser except the finished zip.
            </p>
            <a className="scroll-cue" href="#form">
              ↓ start below
            </a>
          </div>

          <div
            className="hero-stack"
            ref={heroRef}
            onPointerMove={handleHeroPointerMove}
            onPointerLeave={handleHeroPointerLeave}
            aria-hidden="true"
          >
            <div className="hero-card card-a">👾</div>
            <div className="hero-card card-b">🔥</div>
            <div className="hero-card card-c">✦</div>
          </div>
        </header>

        <section className="section" id="how-it-works" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading">How it works</h2>
          <div className="steps-grid">
            {STEPS.map((step) => (
              <div className="step-card" key={step.num}>
                <span className="step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="sources" aria-labelledby="sources-heading">
          <h2 id="sources-heading">The four sources, explained</h2>
          <p className="section-intro">
            These aren&apos;t interchangeable — each platform is a separate service with its own
            emote library. A channel can (and usually does) have a different set on each one.
          </p>
          <div className="sources-grid">
            {SOURCE_INFO.map((s) => (
              <div className="source-card" key={s.id}>
                <h3>{s.name}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

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
            </div>

            {sources.twitch && (
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
                  <input type="radio" name="format" checked={format === "both"} onChange={() => setFormat("both")} />
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
                <input type="checkbox" checked={includeGlobal} onChange={(e) => setIncludeGlobal(e.target.checked)} />
                Include each platform&apos;s global emote set too
              </label>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="accessCode">
                Access code <span style={{ color: "var(--muted)", fontWeight: 500 }}>(only if this deployment has one set)</span>
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
            <div className="terminal-stat">
              <span>received</span>
              <span>{formatBytes(bytesReceived)}</span>
            </div>
          </div>
        </form>
      </div>
      </section>

      {preview && (
        <section className="preview-panel">
          <div className="preview-panel-head">
            <h2>Preview — {preview.displayName}</h2>
            <button type="button" className="preview-close" onClick={() => setPreview(null)}>
              ✕ close
            </button>
          </div>

          {Object.values(preview.sources).every((d) => !d.error && d.total === 0) && (
            <p className="preview-empty">
              This channel doesn&apos;t have emotes on any of the sources you picked — nothing
              to preview or download here.
            </p>
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
            // This channel simply doesn't use this platform — skip the
            // section entirely instead of showing an empty "0 emotes" block.
            if (data.total === 0) return null;
            return (
              <div className="preview-source" key={sourceId}>
                <h3>
                  {label} — {data.total} emote{data.total === 1 ? "" : "s"}
                </h3>
                {sourceId === "twitch" && data.tierCounts && (
                  <p className="tier-breakdown">
                    Tier 1: {data.tierCounts["1000"]} · Tier 2: {data.tierCounts["2000"]} · Tier 3: {data.tierCounts["3000"]}
                    {" "}(raw total before filters: {data.rawTotal})
                  </p>
                )}
                {data.items.length === 0 ? (
                  <p className="preview-empty">No emotes matched — nothing to show here.</p>
                ) : (
                  <>
                    <div className="preview-grid">
                      {data.items.slice(0, visibleCounts[sourceId] || PAGE_SIZE).map((item, i) => (
                        <div className="preview-tile" key={`${sourceId}-${i}`} title={item.name}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.previewUrl} alt={item.name} loading="lazy" />
                          {item.tier && <span className="preview-tier-badge">T{item.tier[0]}</span>}
                          <span className="preview-tile-name">{item.name}</span>
                        </div>
                      ))}
                    </div>
                    {(visibleCounts[sourceId] || PAGE_SIZE) < data.items.length ? (
                      <button type="button" className="load-more-btn" onClick={() => loadMore(sourceId)}>
                        Load more ({data.items.length - (visibleCounts[sourceId] || PAGE_SIZE)} remaining)
                      </button>
                    ) : (
                      data.items.length > PAGE_SIZE && <p className="all-loaded">— all {data.items.length} loaded —</p>
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
          <span>emote-grabber — 7TV / BTTV / FFZ / Twitch</span>
          <div className="footer-links">
            <a href="/legal">Terms · Privacy · Copyright</a>
          </div>
        </div>
        <p className="footer-note">
          Built to replace StreamDatabase after it stopped working. Not affiliated with Twitch,
          7TV, BetterTTV, or FrankerFaceZ — just talks to their public APIs.
        </p>
      </footer>
      </main>
    </>
  );
}
