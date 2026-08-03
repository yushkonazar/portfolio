"use client";

import dynamic from "next/dynamic";

const HeroBackground = dynamic(
  () => import("@/components/hero-background").then((m) => m.HeroBackground),
  { ssr: false },
);

export function Hero({ name, role }: { name: string; role: string }) {
  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <HeroBackground />
      <div className="relative z-10">
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          {name}
        </h1>
        <p className="mt-3 text-lg text-white/70">{role}</p>
      </div>
    </div>
  );
}
