import { Inter, Manrope } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ppt-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ppt-manrope",
});

/** Presentation-only font scope; the marketing site keeps its existing type system. */
export default function PresentationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${inter.variable} ${manrope.variable}`}>{children}</div>;
}
