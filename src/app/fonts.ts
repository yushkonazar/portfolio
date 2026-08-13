import { Manrope } from "next/font/google";

// Shared so the locale layout and the standalone 404 document don't each
// declare their own instance of the same font.
//
// Only the one font lives here. next/font attributes a declaration to every
// entry whose import graph reaches the module it sits in, so putting the 404's
// mono beside this one had the home page emitting <link rel="preload"> for two
// JetBrains Mono files it never renders a character of. It is declared in the
// page that uses it instead.
export const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});
