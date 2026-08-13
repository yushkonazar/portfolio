/**
 * What I'm working on this month, for the terminal's `now`.
 *
 * Its own module, and not because it needs one: a string in a component is code
 * to everyone who reads the repo, and this is content that has to be edited by
 * hand every few weeks. Here it is obvious what it is and obvious when it was
 * last true.
 *
 * `asOf` is printed. A `now` that quietly describes last spring is worse than no
 * `now` at all, so the date goes on screen next to the answer and dates itself in
 * front of the reader rather than in a comment nobody opens.
 *
 * English only, like the rest of the terminal.
 */
export const now = {
  asOf: "August 2026",
  lines: [
    "Sharpening the projects that are already out.",
    "Designing a new personal one.",
    "Talking to prospective clients.",
    "Reading the job market closely.",
  ],
} as const;
