import type { Metadata } from "next";
import "./globals.css";

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
  },
  twitter: {
    card: "summary_large_image",
    site: "@sumgrecords",
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
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
