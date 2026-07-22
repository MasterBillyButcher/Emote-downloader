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
        alignItems: "center",
        padding: "0 90px",
        background: "#0b0d14",
        backgroundImage:
          "radial-gradient(circle at 15% 15%, rgba(157,91,255,0.3), transparent 55%), radial-gradient(circle at 90% 80%, rgba(37,99,235,0.25), transparent 55%)",
        color: "#e5e7eb",
        fontFamily: "sans-serif",
      }}
    >
      {/* Mark: folder/pouch silhouette with an arrow, no borrowed logos or characters */}
      <div
        style={{
          width: 220,
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "#1a1d24",
          border: "2px solid rgba(157,91,255,0.4)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 44,
            width: 148,
            height: 78,
            borderRadius: 20,
            background: "linear-gradient(160deg, #9d5bff 0%, #2563eb 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 108,
            left: 62,
            width: 56,
            height: 26,
            borderRadius: "10px 10px 0 0",
            background: "linear-gradient(160deg, #9d5bff 0%, #7c3aed 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            top: 46,
            color: "#f5f3fb",
            fontSize: 92,
            fontWeight: 700,
          }}
        >
          ↓
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginLeft: 56 }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1 }}>
          <span style={{ color: "#f5f3fb" }}>EMOTE</span>
          <span style={{ color: "#9d5bff", marginLeft: 20 }}>GRABBER</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 3,
            color: "#9d5bff",
            marginTop: 16,
          }}
        >
          DOWNLOAD · ORGANIZE · EVERY EMOTE
        </div>
        <div style={{ display: "flex", fontSize: 24, marginTop: 24, color: "#9ca3af", maxWidth: 620 }}>
          Preview, filter by format and tier, download 7TV/BTTV/FFZ/Twitch emotes as one zip.
        </div>
      </div>
    </div>,
    { ...size }
  );
}
