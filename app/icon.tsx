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
        backgroundColor: "#171717",
        borderRadius: 7,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 14 14">
        <rect width="6.5" height="6.5" rx="1" fill="#fafafa" />
        <rect
          x="7.5"
          width="6.5"
          height="6.5"
          rx="1"
          fill="#fafafa"
          fillOpacity="0.4"
        />
        <rect
          y="7.5"
          width="6.5"
          height="6.5"
          rx="1"
          fill="#fafafa"
          fillOpacity="0.4"
        />
        <rect x="7.5" y="7.5" width="6.5" height="6.5" rx="1" fill="#fafafa" />
      </svg>
    </div>,
    { ...size },
  );
}
