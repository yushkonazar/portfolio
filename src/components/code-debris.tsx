/**
 * The 404's centrepiece: a path that didn't resolve, shown as the code for it
 * coming apart.
 *
 * Placement is computed rather than hand-listed, and computed once at module
 * load rather than per render. Forty-odd fragments typed out by hand would be
 * forty numbers nobody could adjust — moving the cloud would mean editing all of
 * them — while `Math.random()` at render time would give a server and a client
 * two different clouds and a hydration mismatch, and a different cloud per build
 * for a page that is prerendered.
 *
 * So: a golden-angle spiral. Successive fragments land ~137.5° apart, which is
 * the arrangement that never repeats a spoke — the reason it turns up in
 * sunflowers — so the scatter reads as thrown rather than as a pattern, while
 * being the same scatter every time.
 */

/** Real fragments of the lookup that failed, so the debris says something. */
const SOURCE = [
  "func.resolve(path)",
  "if (!page) {",
  "  return notFound()",
  "}",
  "const slug = segments",
  "  .filter(Boolean)",
  "  .join('/')",
  "match(routes, slug)",
  "throw new NotFound(",
  "404",
  "await params",
  "generateStaticParams()",
  "locale ?? default",
  "// no such route",
  "pathname.split('/')",
  "return null",
  "catch (error) {",
  "status: 404",
  "revalidate = false",
  "segments.at(-1)",
  "!routes.has(key)",
  "resolve → miss",
];

type Fragment = {
  text: string;
  /** Percentages of the field, so the cloud scales with its container. */
  x: number;
  y: number;
  rotate: number;
  size: number;
  opacity: number;
  ember: boolean;
};

const COUNT = 46;
/** 137.5° in radians — the angle that keeps successive items off each other's
 * spokes no matter how many there are. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * Wider than tall by this much. The field sits behind a line of text, so a
 * circular cloud would pile density above and below the words where it competes
 * with them, and leave the ends of the line bare.
 */
const SPREAD_X = 2.15;

const FRAGMENTS: Fragment[] = Array.from({ length: COUNT }, (_, i) => {
  const angle = i * GOLDEN;
  // sqrt, not linear: equal-area rings, so the middle stays dense and the outside
  // thins out instead of the whole cloud being evenly sparse.
  const radius = 3 + Math.sqrt(i / COUNT) * 44;
  const near = 1 - radius / 47;

  return {
    text: SOURCE[i % SOURCE.length],
    x: 50 + Math.cos(angle) * radius * SPREAD_X,
    y: 50 + Math.sin(angle) * radius,
    // Leaning along its own way out from the centre, damped so nothing ends up
    // sideways and unreadable.
    rotate: ((angle * 180) / Math.PI) % 47 - 23,
    // The inner fragments have to be readable — a cloud of illegible specks is
    // texture, and the point is that this is the code that failed. At 7px, which
    // is where the first pass put them, none of it was.
    size: 9 + near * 9,
    // Brightest at the break, fading to almost nothing at the edges.
    opacity: 0.14 + near * 0.7,
    // Two in three carry the ember; the rest are near-white, which is what keeps
    // the cloud from reading as one flat wash of orange.
    ember: i % 3 !== 0,
  };
  // Centres only, so a fragment near the edge is still clipped by the field and
  // the cloud reads as continuing past it. This drops the ones that would land
  // wholly outside and cost markup for nothing.
}).filter((f) => f.x > -6 && f.x < 106 && f.y > -4 && f.y < 104);

export function CodeDebris() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {FRAGMENTS.map((f, i) => (
        <span
          key={`${i}-${f.text}`}
          className={f.ember ? "text-accent-bright" : "text-white"}
          style={{
            position: "absolute",
            left: `${f.x}%`,
            top: `${f.y}%`,
            fontSize: `${f.size}px`,
            opacity: f.opacity,
            // The translate centres each fragment on its own point; without it
            // `left`/`top` would place its corner there and the cloud would
            // drift down and right of where it was computed.
            transform: `translate(-50%, -50%) rotate(${f.rotate}deg)`,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
            letterSpacing: "0.02em",
          }}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}
