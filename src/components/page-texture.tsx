/**
 * The surface the whole site sits on, pinned to the viewport behind every
 * other layer.
 *
 * A field of dark extruded blocks. It was picked over the alternatives on a
 * measurement rather than a preference: sampled across the frame its worst
 * contrast against `--color-muted-foreground` is 5.07:1 with a 4.5 floor, its
 * brightest pixel is luma 49 against a ceiling of 57, and no part of it
 * exceeds that ceiling. Every other candidate needed dimming to get there, and
 * dimming a texture is what turns it into grey noise.
 *
 * Shipped at its native 576x1024 on purpose. It is near-black and low
 * contrast, so upscaling the file would add kilobytes without adding anything
 * the eye can resolve — the browser's own scaling is indistinguishable here.
 *
 * `cover` rather than stretched: unlike a frame, this has no edge that has to
 * meet the viewport edge, and the block field is homogeneous enough that
 * cropping it costs nothing.
 *
 * Fixed, so the page moves over a still surface instead of dragging a tall
 * image along with it — one paint rather than a repaint per scroll.
 */
export function PageTexture() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-[url('/texture.webp')] bg-cover bg-center"
    />
  );
}
