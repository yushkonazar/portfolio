import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#0c0c0c",
          padding: "96px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -140,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(217,119,6,0.38) 0%, rgba(5,5,5,0) 70%)",
            display: "flex",
          }}
        />
        <div style={{ fontSize: 76, fontWeight: 700, color: "#fafafa", display: "flex" }}>
          {t("name")}
        </div>
        <div
          style={{
            fontSize: 38,
            color: "#f59e0b",
            marginTop: 24,
            display: "flex",
          }}
        >
          {t("role")}
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#a1a1aa",
            marginTop: 56,
            display: "flex",
          }}
        >
          yushko.dev
        </div>
      </div>
    ),
    { ...size },
  );
}
