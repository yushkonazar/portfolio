/**
 * A vignette pinned to the viewport, behind everything the page draws.
 *
 * The source is a phone wallpaper: a dark field inside a bright border. Only
 * the border is wanted, so the asset is built with brightness mapped to
 * opacity — the middle is fully transparent (measured: max alpha 0), which is
 * what keeps the page colour exactly `--color-background` where the content
 * sits. Nothing about text contrast or the portrait's blend changes.
 *
 * Stretched rather than cropped: a frame has to meet the viewport edges to be
 * a frame, and `cover` on a 9:16 source in a landscape window would push the
 * top and bottom bands entirely off-screen. The texture is smoke, so it has no
 * straight lines to give the stretch away.
 *
 * Fixed, not scrolling: it reads as a window the page moves behind. That also
 * means one paint instead of repainting a tall image on every scroll.
 */
export function PageFrame() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-[url('/frame-smoke.webp')] bg-[length:100%_100%] bg-no-repeat opacity-70"
    />
  );
}
