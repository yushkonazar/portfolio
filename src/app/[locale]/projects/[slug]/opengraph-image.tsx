import { ImageResponse } from "next/og";
import { projects } from "@/lib/projects";
import { OG_SIZE, OgFrame, manropeFonts } from "@/lib/og";
import type { Locale } from "@/i18n/routing";

export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const currentLocale = locale as Locale;
  const project = projects.find((p) => p.slug === slug);
  const fonts = await manropeFonts();

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ fontSize: 28, color: "#f59e0b", display: "flex" }}>
          Yushko Nazar
        </div>
        <div
          style={{
            fontSize: 66,
            fontWeight: 700,
            color: "#fafafa",
            marginTop: 20,
            display: "flex",
          }}
        >
          {project?.title ?? slug}
        </div>
        {project && (
          <div
            style={{
              fontSize: 28,
              color: "#a1a1aa",
              marginTop: 28,
              maxWidth: 920,
              display: "flex",
            }}
          >
            {project.tagline[currentLocale]}
          </div>
        )}
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
