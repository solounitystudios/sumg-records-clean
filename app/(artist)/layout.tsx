"use client";
import { CmsStoreProvider } from "@/lib/cms/store";

export default function ArtistGroupLayout({ children }: { children: React.ReactNode }) {
  return <CmsStoreProvider>{children}</CmsStoreProvider>;
}
