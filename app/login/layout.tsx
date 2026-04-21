import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "SUMG Records Login | Admin & Creator Access",
  },
  description:
    "Secure login for SUMG Records artists, staff, creators and management dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
