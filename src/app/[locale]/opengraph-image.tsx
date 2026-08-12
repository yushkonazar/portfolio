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
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const fonts = await manropeFonts();

  return new ImageResponse(
    (
      <OgFrame>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: "#fafafa",
            display: "flex",
          }}
        >
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
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
