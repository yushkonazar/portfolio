"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Plays a one-shot rise-in the first time its contents are scrolled to.
 *
 * Starts visible and only hides itself once the observer is attached, so the
 * content is readable if JavaScript never runs — hiding it in the markup and
 * revealing it later would leave a blank page in that case.
 */
export function Reveal({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  /** Milliseconds to hold before rising, for staggering siblings. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "armed" | "revealed">("static");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already on screen at mount: leave it alone rather than flashing it out
    // and back in.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState("armed");

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setState("revealed");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        className,
        state === "armed" && "opacity-0",
        state === "revealed" && "reveal-up",
      )}
    >
      {children}
    </div>
  );
}
