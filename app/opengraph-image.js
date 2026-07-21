import { ImageResponse } from "next/og";

export const alt = "Emote Grabber: download 7TV, BTTV, FFZ & Twitch Subscriber Emotes as a zip";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "70px 90px",
        background: "#08070d",
        backgroundImage:
          "radial-gradient(circle at 15% 10%, rgba(139,92,246,0.35), transparent 55%), radial-gradient(circle at 90% 20%, rgba(59,130,246,0.28), transparent 55%)",
        color: "#f5f3fb",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
        <div
          style={{
            width: 52,
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
            color: "#fff",
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          ↓
        </div>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>Emote Grabber</div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: 2,
          color: "#9791b3",
          marginBottom: 18,
        }}
      >
        7TV · BTTV · FFZ · TWITCH
      </div>
      <div style={{ display: "flex", fontSize: 66, fontWeight: 700, lineHeight: 1.08, maxWidth: 980 }}>
        Download. Organize. Every emote.
      </div>
      <div style={{ display: "flex", fontSize: 24, marginTop: 24, color: "#9791b3", maxWidth: 850 }}>
        Preview, filter by format and tier, download it all as one zip.
      </div>
    </div>,
    { ...size }
  );
}
