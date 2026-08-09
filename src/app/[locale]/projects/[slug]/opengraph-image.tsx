import { ImageResponse } from "next/og";
import { projects } from "@/lib/projects";
import type { Locale } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
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
      </div>
    ),
    { ...size },
  );
}
