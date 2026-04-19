import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "SUMG Records | Premium Music Label",
    template: "%s | SUMG Records",
  },
  description:
    "SUMG Records is a premier independent music label dedicated to developing world-class artists and producing timeless music.",
  keywords: ["SUMG Records", "music label", "hip-hop", "R&B", "artists", "producers"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sumgrecords.com",
    siteName: "SUMG Records",
    title: "SUMG Records | Premium Music Label",
    description:
      "SUMG Records is a premier independent music label dedicated to developing world-class artists.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SUMG Records | Premium Music Label",
    description:
      "SUMG Records is a premier independent music label dedicated to developing world-class artists.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark-900 text-white antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
