import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUMG Records — Premium Independent Label",
  description:
    "SUMG Records is a premium independent music label — building artists, sound, and culture from the ground up.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
