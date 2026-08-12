import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { OG_SIZE, OgFrame, manropeFonts } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ResumePage" });
  const home = await getTranslations({ locale, namespace: "HomePage" });
  const fonts = await manropeFonts();

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ fontSize: 28, color: "#f59e0b", display: "flex" }}>
          {t("title")}
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#fafafa",
            marginTop: 20,
            display: "flex",
          }}
        >
          {home("name")}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#a1a1aa",
            marginTop: 24,
            display: "flex",
          }}
        >
          {home("role")}
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
