/**
 * A vignette pinned to the viewport, behind everything the page draws.
 *
 * The source is a phone wallpaper: a dark field inside a bright border. Only
 * the border is wanted, so the asset is built with brightness mapped to
 * opacity — the middle drops out entirely, which is what keeps the page colour
 * exactly `--color-background` where the content sits.
 *
 * Sides only, and that is the load-bearing detail. The source frames all four
 * edges, but this layer is fixed while the page scrolls through it, so a band
 * across the top or bottom sits under every line of copy on the site in turn.
 * Measured: with the horizontal bands in, muted text over them fell to 1.0:1
 * against a 4.5 floor. The asset now fades out over the top and bottom third,
 * leaving the two side bands, which the content column never reaches — worst
 * case there is 5.9:1 at 390px through 1920px.
 *
 * Stretched rather than cropped: a frame has to meet the viewport edges, and
 * `cover` on a 9:16 source in a landscape window would push its sides out of
 * view. Torn stone is irregular enough that the horizontal stretch reads as
 * more of the same texture.
 *
 * Swap the filename for `frame-smoke.webp` to get the softer variant; both are
 * built the same way and an unreferenced one is never downloaded.
 */
export function PageFrame() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-[url('/frame-stone.webp')] bg-[length:100%_100%] bg-no-repeat opacity-85"
    />
  );
}
