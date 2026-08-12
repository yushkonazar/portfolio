"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { encodeQr, isFinderModule, qrCapacity, qrDataPath, type QrCode } from "@/lib/qr";
import { cn } from "@/lib/utils";

/**
 * The back of the portrait card: a working QR generator on a paper ticket.
 *
 * The card's front answers "who is this". The back is the reward for turning it
 * over — the owner's code prints itself, and the field it came from is editable,
 * so the thing is a tool rather than a picture of one.
 *
 * The encoder runs here, on the client, because the payload is whatever the
 * visitor typed. Nothing is fetched and nothing is stored; the text goes into
 * the encoder as bytes and comes back as geometry, which is also why none of it
 * ever reaches the DOM as text.
 */

/**
 * The design specified Q. M ships instead: Q's extra correction was chosen as
 * headroom for the dot modules, but shape costs no correction — only module size
 * and gaps do — and Q's 20-byte ceiling rejects most real links. M carries 42.
 * One constant to change if that trade turns out wrong.
 */
const QR_LEVEL = "M" as const;

/** Modules of margin around the code, inside the SVG viewBox. */
const QUIET = 2;

const PRINT_MS = 860;
const TEAR_MS = 440;
/** Long enough after the flip that the turn has finished before paper moves. */
const AUTO_PRINT_MS = 420;

const INK = "#17130f";
const EYE_INK = "#8a4a08";
const PAPER = "#f4ecdd";

/** Rendered dark-on-light on its own sheet: inverted codes don't scan. */
const OVERLAY_SCRIM = "rgba(8,6,4,.82)";
const OVERLAY_GLOW =
  "radial-gradient(125% 85% at 50% 52%, rgba(245,158,11,.24) 0%, rgba(245,158,11,.07) 46%, rgba(245,158,11,0) 78%)";

const RIP_TOP =
  "polygon(0 0, 100% 0, 100% 50%, 90% 54%, 80% 49%, 70% 55%, 60% 50%, 50% 56%, 40% 50%, 30% 55%, 20% 49%, 10% 54%, 0 50%)";
const RIP_BOTTOM =
  "polygon(0 50%, 10% 54%, 20% 49%, 30% 55%, 40% 50%, 50% 56%, 60% 50%, 70% 55%, 80% 49%, 90% 54%, 100% 50%, 100% 100%, 0 100%)";

type Failure = "" | "scheme" | "length";

/** Only http(s) survives: `javascript:` and `data:` fail the same check. */
function parseLink(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function QrPanel({
  ownerUrl,
  onFlipBack,
}: {
  ownerUrl: string;
  onFlipBack: () => void;
}) {
  const t = useTranslations("PortraitCard");
  const capacity = qrCapacity(QR_LEVEL);

  const [url, setUrl] = useState(() => ownerUrl.slice(0, capacity));
  const [code, setCode] = useState<QrCode | null>(null);
  /** The text that produced `code` — compared for staleness, never rendered. */
  const [codeUrl, setCodeUrl] = useState("");
  const [href, setHref] = useState("");
  const [failure, setFailure] = useState<Failure>("");
  const [printing, setPrinting] = useState(false);
  const [tearing, setTearing] = useState(false);
  const [torn, setTorn] = useState<QrCode | null>(null);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  /** Touch has no hover, so a tap latches the overlay open. */
  const [pinned, setPinned] = useState(false);

  const printTimer = useRef<number | null>(null);
  const tearTimer = useRef<number | null>(null);
  const autoTimer = useRef<number | null>(null);

  /**
   * The field and the printed code are mirrored into refs because `print` runs
   * from timers as well as from clicks — the auto-print fires 420ms after mount
   * and would otherwise close over the state as it was at mount. Written from
   * handlers, never during a render.
   */
  const urlRef = useRef(url);
  const codeRef = useRef<QrCode | null>(null);
  const trackUrl = (next: string) => {
    urlRef.current = next;
    setUrl(next);
  };
  const trackCode = (next: QrCode | null) => {
    codeRef.current = next;
    setCode(next);
  };

  const print = useCallback(() => {
    const raw = urlRef.current.trim();
    const parsed = parseLink(raw);
    if (!parsed) {
      setFailure("scheme");
      return;
    }
    const next = encodeQr(raw, QR_LEVEL);
    if (!next) {
      setFailure("length");
      return;
    }

    if (printTimer.current !== null) window.clearTimeout(printTimer.current);
    if (tearTimer.current !== null) window.clearTimeout(tearTimer.current);

    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lay = () => {
      trackCode(next);
      setCodeUrl(raw);
      setHref(parsed.href);
      setFailure("");
      setPinned(false);
      setTearing(false);
      setTorn(null);
      setPrinting(animate);
      if (animate) {
        printTimer.current = window.setTimeout(
          () => setPrinting(false),
          PRINT_MS + 140,
        );
      }
    };

    // Nothing erases itself: a code already on the paper is torn off first.
    if (animate && codeRef.current) {
      setTorn(codeRef.current);
      trackCode(null);
      setTearing(true);
      setPrinting(false);
      setPinned(false);
      setFailure("");
      tearTimer.current = window.setTimeout(lay, TEAR_MS);
    } else {
      lay();
    }
  }, []);

  // The card arrives showing the owner's code coming out of the printer rather
  // than an empty tool waiting to be understood. Whether that print animates is
  // read inside `print`, at the moment it runs, so there's no motion preference
  // to hold in state here.
  useEffect(() => {
    autoTimer.current = window.setTimeout(print, AUTO_PRINT_MS);
    return () => {
      for (const timer of [autoTimer, printTimer, tearTimer]) {
        if (timer.current !== null) window.clearTimeout(timer.current);
      }
    };
  }, [print]);

  const stale = code !== null && url.trim() !== codeUrl && !printing;
  const overlayOpen =
    (hovering || focusWithin || pinned) && code !== null && !printing;

  const hint = printing || tearing
    ? t("qrHintPrinting")
    : failure === "scheme"
      ? t("qrHintScheme")
      : failure === "length"
        ? t("qrHintLength")
        : stale
          ? t("qrHintStale")
          : code
            ? t("qrHintReady")
            : t("qrHintEmpty");

  return (
    // 10px rather than the design's 12: the column was 8px over its 322px
    // budget, which pushed the privacy note in the Ukrainian copy onto a second
    // line and the footer past the card's edge.
    <div className="relative z-1 flex h-full flex-col gap-2.5">
      {/* Header: monogram, and what the printed code actually is. */}
      <div className="order-0 flex h-[14px] items-center">
        <span className="text-accent-bright font-mono text-[15px] font-bold tracking-[0.16em]">
          YN
        </span>
        <span className="ml-auto font-mono text-[9px] leading-none tracking-[0.1em] text-white/[0.26]">
          {code ? `${code.size}×${code.size} · ${code.level}` : ""}
        </span>
      </div>

      <div className="order-2 flex items-end gap-[9px]">
        <input
          type="text"
          value={url}
          onChange={(event) => {
            trackUrl(event.target.value);
            setFailure("");
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            print();
          }}
          placeholder={t("qrPlaceholder")}
          aria-label={t("qrInputLabel")}
          maxLength={capacity}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          inputMode="url"
          className="caret-accent-bright focus:border-b-accent h-[26px] min-w-0 flex-1 border-0 border-b border-white/[0.16] bg-transparent px-0 pb-[7px] font-mono text-[10.5px] leading-none text-white/[0.88] outline-none placeholder:text-white/[0.22]"
        />
        <span className="relative flex-none">
          <button
            type="button"
            onClick={print}
            aria-label={stale || !code ? t("qrPrint") : t("qrReprint")}
            className="hover:border-accent-bright/55 hover:bg-accent-bright/10 focus-visible:border-accent-bright text-accent-bright flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded border border-white/[0.16] bg-transparent font-mono text-[12px] leading-none transition-colors outline-none"
          >
            ↵
          </button>
          {stale && (
            <span
              aria-hidden
              className="bg-accent-bright absolute -top-[3px] -right-[3px] h-[5px] w-[5px] rounded-full"
            />
          )}
        </span>
      </div>

      <div
        aria-live="polite"
        className={cn(
          "order-3 -mt-1 min-h-[12px] font-mono text-[9.5px] leading-[1.25] tracking-[0.02em]",
          failure ? "text-accent-bright/80" : "text-white/30",
        )}
      >
        {hint}
      </div>

      {/* Last but one in the DOM and first in the visual stack, on purpose: the
          field feeds the code, so tabbing has to reach the field and its print
          button before the actions that act on the result. `order` moves the
          picture; it must not move the sequence. */}
      <Ticket
        code={code}
        torn={torn}
        printing={printing}
        tearing={tearing}
        stale={stale}
        overlayOpen={overlayOpen}
        href={href}
        onHoverChange={setHovering}
        onFocusChange={setFocusWithin}
        onTogglePin={() => setPinned((current) => !current)}
      />

      <div className="order-4 mt-auto flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] leading-none text-white/20">
          {t("qrPrivacy")}
        </span>
        {/* A drawn button rather than 9px of grey text, and paired with the
            print control: `↵` puts a code on the paper, `↺` turns the card
            back. The word moves to the label and the tooltip — spelled out, it
            needed 73px next to a privacy note that already wanted 143, and the
            two together did not fit the column in either language. */}
        <button
          type="button"
          onClick={onFlipBack}
          aria-label={t("flipBack")}
          title={t("flipBack")}
          className="hover:border-accent-bright/55 hover:bg-accent-bright/10 focus-visible:border-accent-bright text-accent-bright flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-white/[0.16] bg-transparent font-mono text-[11px] leading-none transition-colors outline-none"
        >
          ↺
        </button>
      </div>

    </div>
  );
}

/** The paper, everything printed on it, and the actions over it. */
function Ticket({
  code,
  torn,
  printing,
  tearing,
  stale,
  overlayOpen,
  href,
  onHoverChange,
  onFocusChange,
  onTogglePin,
}: {
  code: QrCode | null;
  torn: QrCode | null;
  printing: boolean;
  tearing: boolean;
  stale: boolean;
  overlayOpen: boolean;
  href: string;
  onHoverChange: (value: boolean) => void;
  onFocusChange: (value: boolean) => void;
  onTogglePin: () => void;
}) {
  const t = useTranslations("PortraitCard");

  const download = () => {
    if (!code) return;
    // A canvas PNG rather than the SVG on screen: an SVG saved to disk runs
    // whatever script it carries when it's opened, and this is a file someone
    // keeps. The name is fixed so nothing derived from the input reaches it.
    const scale = 12;
    const span = code.size + QUIET * 2;
    const canvas = document.createElement("canvas");
    canvas.width = span * scale;
    canvas.height = span * scale;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = PAPER;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < code.size; y++) {
      for (let x = 0; x < code.size; x++) {
        if (!code.modules[y][x]) continue;
        const eye = isFinderModule(x, y, code.size);
        context.fillStyle = eye ? EYE_INK : INK;
        if (eye) {
          context.fillRect((x + QUIET) * scale, (y + QUIET) * scale, scale, scale);
          continue;
        }
        context.beginPath();
        context.arc(
          (x + QUIET + 0.5) * scale,
          (y + QUIET + 0.5) * scale,
          scale / 2,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }

    const link = document.createElement("a");
    link.download = "qr-code.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      onClick={onTogglePin}
      style={{ background: PAPER }}
      // Square and as wide as the column allows, rather than a fixed 204px: the
      // card's width comes from the photograph's aspect ratio, so pinning the
      // paper to a constant left it a hair wider than the space it sits in.
      className="relative z-1 order-1 aspect-square w-full overflow-hidden rounded-[3px] shadow-[0_4px_16px_rgba(0,0,0,.6),0_0_0_1px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.55)]"
    >
      {code && (
        <div
          style={{
            opacity: stale ? 0.42 : 1,
            transition: "opacity 260ms ease",
            animation: printing
              ? `qr-reveal ${PRINT_MS}ms steps(${code.size}) both, qr-settle ${PRINT_MS + 140}ms ease-out both`
              : "none",
          }}
        >
          <QrArt code={code} label={t("qrLabel")} />
        </div>
      )}

      {/* Before the first print: where the eyes will be, and nothing else. */}
      {!code && !tearing && (
        <svg viewBox="0 0 33 33" width="100%" height="100%" aria-hidden>
          {[
            [2.5, 2.5],
            [24.5, 2.5],
            [2.5, 24.5],
          ].map(([x, y]) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="6"
              height="6"
              rx="1.8"
              fill="none"
              stroke={INK}
              strokeOpacity=".13"
            />
          ))}
        </svg>
      )}

      {tearing && torn && (
        <>
          {[
            { clip: RIP_TOP, animation: `qr-rip-top ${TEAR_MS}ms cubic-bezier(.45,0,.75,.55) both` },
            { clip: RIP_BOTTOM, animation: `qr-rip-bottom ${TEAR_MS}ms cubic-bezier(.45,0,.75,.55) both` },
          ].map((half) => (
            <div
              key={half.clip}
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: PAPER, clipPath: half.clip, animation: half.animation }}
            >
              <QrArt code={torn} />
            </div>
          ))}
        </>
      )}

      {/* A full-height track carrying the head at its bottom edge, so the
          animation can travel the paper in percentages. */}
      {printing && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ animation: `qr-head ${PRINT_MS}ms linear both` }}
        >
          <div
            className="absolute inset-x-0 bottom-0 h-[22px]"
            style={{
              background:
                "linear-gradient(to top, rgba(245,158,11,.26), rgba(245,158,11,0))",
              borderBottom: "1.5px solid #f59e0b",
              boxShadow: "0 0 14px rgba(245,158,11,.55)",
            }}
          />
        </div>
      )}

      {/* Kept mounted and focusable at all times — hidden with opacity, never
          display, so tabbing can reach the actions without a pointer. */}
      {code && (
        <div
          className="absolute inset-0 flex"
          style={{
            opacity: overlayOpen ? 1 : 0,
            pointerEvents: overlayOpen ? "auto" : "none",
            transition: "opacity 170ms ease",
          }}
        >
          <OverlayHalf
            as="a"
            href={href}
            glyph="↗"
            label={t("qrOpen")}
            open={overlayOpen}
            side="left"
          />
          <OverlayHalf
            as="button"
            onClick={download}
            glyph="↓"
            label={t("qrDownload")}
            open={overlayOpen}
            side="right"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-[30px] bottom-[30px] left-1/2 w-px"
            style={{
              background:
                "linear-gradient(rgba(255,255,255,0), rgba(255,255,255,.16) 22%, rgba(255,255,255,.16) 78%, rgba(255,255,255,0))",
              opacity: overlayOpen ? 1 : 0,
              transition: "opacity 220ms ease 90ms",
            }}
          />
        </div>
      )}

      {/* Above the overlay, so the ticket keeps its silhouette while dimmed.
          The notch colour has to be the card's, not transparent. */}
      {(["top", "bottom"] as const).map((edge) => (
        <div
          key={edge}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-[7px]"
          style={{
            [edge]: 0,
            backgroundImage: `radial-gradient(circle 4px at 6px ${edge === "top" ? "0" : "7px"}, #0a0a0a 97%, rgba(10,10,10,0) 100%)`,
            backgroundSize: "12px 7px",
            backgroundRepeat: "repeat-x",
          }}
        />
      ))}
    </div>
  );
}

/** The code as geometry: dots for data, drawn rings and cores for the eyes. */
function QrArt({ code, label }: { code: QrCode; label?: string }) {
  const path = useMemo(() => qrDataPath(code, QUIET), [code]);
  const span = code.size + QUIET * 2;
  const near = QUIET + 0.5;
  const far = code.size - 7 + QUIET + 0.5;
  const coreNear = QUIET + 2;
  const coreFar = code.size - 7 + QUIET + 2;

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      width="100%"
      height="100%"
      shapeRendering="geometricPrecision"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d={path} fill={INK} />
      {[
        [near, near],
        [far, near],
        [near, far],
      ].map(([x, y]) => (
        <rect
          key={`ring-${x}-${y}`}
          x={x}
          y={y}
          width="6"
          height="6"
          rx="1.8"
          fill="none"
          stroke={EYE_INK}
          strokeWidth="1"
        />
      ))}
      {[
        [coreNear, coreNear],
        [coreFar, coreNear],
        [coreNear, coreFar],
      ].map(([x, y]) => (
        <rect
          key={`core-${x}-${y}`}
          x={x}
          y={y}
          width="3"
          height="3"
          rx="0.9"
          fill={EYE_INK}
        />
      ))}
    </svg>
  );
}

/**
 * One half of the action plate. The hover state is a glow layered over the
 * scrim rather than a filled rectangle, so an active half has no visible edge
 * and the pair still reads as one plate — and the code stays dark underneath.
 */
function OverlayHalf(
  props: {
    glyph: string;
    label: string;
    open: boolean;
    side: "left" | "right";
  } & (
    | { as: "a"; href: string; onClick?: never }
    | { as: "button"; onClick: () => void; href?: never }
  ),
) {
  const { glyph, label, open, side } = props;
  const [lit, setLit] = useState(false);

  const style = {
    flex: 1,
    minWidth: 0,
    padding: 0,
    border: 0,
    color: lit ? "#fde9c8" : "#f7f2e8",
    background: lit ? `${OVERLAY_GLOW}, ${OVERLAY_SCRIM}` : OVERLAY_SCRIM,
    transform: open
      ? "translateX(0)"
      : `translateX(${side === "left" ? "-12px" : "12px"})`,
    transition:
      "transform 260ms cubic-bezier(.2,.8,.2,1), background 220ms ease, color 220ms ease",
    transitionDelay: open && side === "right" ? "70ms" : "0ms",
  };

  const inner = (
    <>
      <span
        aria-hidden
        className="text-accent-bright flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[rgba(245,158,11,.4)] font-mono text-[14px] leading-none"
      >
        {glyph}
      </span>
      <span>{label}</span>
    </>
  );

  const shared = {
    style,
    // Named explicitly rather than by contents: the glyph beside the word is
    // decorative, and leaving the name to be assembled from both made it come
    // out as "↗ Open" — or, in the accessibility tree, as nothing at all.
    "aria-label": label,
    className:
      "flex cursor-pointer flex-col items-center justify-center gap-[9px] text-[11.5px] leading-none font-medium tracking-[0.01em] no-underline outline-none",
    onMouseEnter: () => setLit(true),
    onMouseLeave: () => setLit(false),
    onFocus: () => setLit(true),
    onBlur: () => setLit(false),
  };

  if (props.as === "a") {
    return (
      <a href={props.href} target="_blank" rel="noopener noreferrer" {...shared}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={props.onClick} {...shared}>
      {inner}
    </button>
  );
}
