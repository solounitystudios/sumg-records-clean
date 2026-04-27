import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://sumgrecords.com"
  ),
  title: {
    template: "%s — SUMG Records",
    default: "SUMG Records — Modern Music Label & Creator Platform",
  },
  description:
    "SUMG Records is a modern music label, creator platform, artist ecosystem, and commerce brand built for the future of entertainment.",
  openGraph: {
    siteName: "SUMG Records",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "SUMG Records — Sound. Vision. Culture.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sumgrecords",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-black text-white antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
