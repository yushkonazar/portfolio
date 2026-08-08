import { Manrope } from "next/font/google";

// Shared so the locale layout and the standalone 404 document don't each
// declare their own instance of the same font.
export const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});
