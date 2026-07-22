import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0d14",
        borderRadius: 7,
        position: "relative",
      }}
    >
      {/* Folder/pouch silhouette, sitting behind the arrow */}
      <div
        style={{
          position: "absolute",
          bottom: 5,
          width: 22,
          height: 12,
          borderRadius: 3,
          background: "linear-gradient(160deg, #9d5bff 0%, #2563eb 100%)",
        }}
      />
      {/* Arrow, layered on top */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          top: 5,
          color: "#fff",
          fontSize: 17,
          fontWeight: 700,
        }}
      >
        ↓
      </div>
    </div>,
    { ...size }
  );
}
