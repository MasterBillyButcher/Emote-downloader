"use client";

import { useState, useRef, useCallback } from "react";

const SOURCE_OPTIONS = [
  { id: "7tv", label: "7TV", hint: "Community overlay emotes, usually GIF" },
  { id: "bttv", label: "BTTV", hint: "BetterTTV overlay emotes" },
  { id: "ffz", label: "FrankerFaceZ", hint: "FFZ overlay emotes" },
  { id: "twitch", label: "Twitch Subscriber Emotes", hint: "Real sub emotes, needs a Twitch Dev app on the server" },
];

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

  function pushLine(text, kind = "idle") {
    setLog((prev) => [...prev.slice(-200), { text, kind }]);
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }

  function toggleSource(id) {
    setSources((prev) => ({ ...prev, [id]: !prev[id] }));
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
    <main className="page">
      <div className="hero">
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
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="chip-field" aria-hidden="true">
        <span className="chip chip1">👾</span>
        <span className="chip chip2">✦</span>
        <span className="chip chip3">🎮</span>
      </div>

      <div
        className="cartridge-wrap"
        ref={wrapRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
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

            <div className="field">
              <button className="submit" type="submit" disabled={busy}>
                {busy ? "Building zip..." : "Download zip"}
              </button>
            </div>

            <p className="footnote">
              Subscriber emotes require <code>TWITCH_CLIENT_ID</code> / <code>TWITCH_CLIENT_SECRET</code> set as
              environment variables on the deployment — see the README.
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
    </main>
  );
}
