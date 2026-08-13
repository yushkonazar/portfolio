/**
 * The header's icon controls share one class string rather than two copies that
 * happen to agree. They have to be the same size to read as one set, and two
 * copies of a size are two things that can drift — which is what had happened:
 * one was `rounded px-2 py-1` with no border and the other a bordered pill with
 * a label, 31x23 next to 55x23.
 *
 * Square, not `py-1`: a 15px glyph in 8px of padding gives 31x31, which is a
 * better target than the 31x23 it replaces and reads as a button rather than as
 * a line of text.
 *
 * The target grows on coarse pointers, where it is the only place it matters.
 * 44x44 is the figure to aim at and 43 is what fits: `p-3.5` around a 15px glyph.
 * Getting the last pixel would mean either a visibly taller header on every
 * device or invisible hit areas wide enough to overlap each other and steal one
 * another's taps, which is worse than a target one pixel short.
 */
export const HEADER_CONTROL =
  "focus-visible:outline-accent-bright text-muted-foreground hover:text-accent-bright flex cursor-pointer items-center justify-center rounded-md p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 pointer-coarse:p-3.5";

/** Both controls draw their glyph at this size — see above about drifting. */
export const HEADER_ICON = "h-[15px] w-[15px]";
