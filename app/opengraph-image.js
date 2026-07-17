import { ImageResponse } from "next/og";

export const alt = "Emote Grabber — download 7TV, BTTV, FFZ & Twitch Subscriber Emotes as a zip";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 90px",
          background: "#efe9dd",
          color: "#16121c",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <div style={{ width: 46, height: 46, background: "#ffc93c", border: "4px solid #16121c", borderRadius: 10 }} />
          <div style={{ width: 46, height: 46, background: "#9146ff", border: "4px solid #16121c", borderRadius: 10 }} />
          <div style={{ width: 46, height: 46, background: "#ff5a36", border: "4px solid #16121c", borderRadius: 10 }} />
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 2, color: "#6c2fd6", marginBottom: 14 }}>
          7TV · BTTV · FFZ · TWITCH
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.05, maxWidth: 950 }}>
          Pop in a channel. Get every emote.
        </div>
        <div style={{ display: "flex", fontSize: 26, marginTop: 24, color: "#6b6458", maxWidth: 850 }}>
          Preview, filter by format and tier, download it all as one zip.
        </div>
      </div>
    ),
    { ...size }
  );
}
