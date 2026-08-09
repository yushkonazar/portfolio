import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 700,
            color: "#f59e0b",
            display: "flex",
          }}
        >
          Y
        </span>
      </div>
    ),
    { ...size },
  );
}
