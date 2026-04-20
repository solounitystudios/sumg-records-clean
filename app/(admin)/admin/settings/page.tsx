"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useState } from "react";
import Link from "next/link";

export default function AdminSettings() {
  const [form, setForm] = useState({
    siteName: "SUMG Records",
    siteTagline: "Sound. Vision. Culture.",
    contactEmail: "",
    instagramUrl: "",
    twitterUrl: "",
    youtubeUrl: "",
    googleAnalyticsId: "",
  });
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    // TODO: persist site settings to the database (homepage_config or a dedicated table).
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <AdminShell title="Settings">
      <div className="max-w-2xl space-y-10">
        <FormSection title="Site Identity">
          <FormField type="text" label="Site Name" value={form.siteName} onChange={(v) => set("siteName", v)} />
          <FormField type="text" label="Site Tagline" value={form.siteTagline} onChange={(v) => set("siteTagline", v)} />
          <FormField type="email" label="Contact Email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} />
        </FormSection>

        <FormSection title="Social Channels">
          <FormField type="url" label="Instagram" value={form.instagramUrl}
            placeholder="https://instagram.com/…" mono onChange={(v) => set("instagramUrl", v)} />
          <FormField type="url" label="Twitter / X" value={form.twitterUrl}
            placeholder="https://twitter.com/…" mono onChange={(v) => set("twitterUrl", v)} />
          <FormField type="url" label="YouTube" value={form.youtubeUrl}
            placeholder="https://youtube.com/…" mono onChange={(v) => set("youtubeUrl", v)} />
        </FormSection>

        <FormSection title="Analytics">
          <FormField
            type="text"
            label="Google Analytics ID"
            value={form.googleAnalyticsId}
            placeholder="G-XXXXXXXXXX"
            mono
            hint="Add the ID to next.config.js or the root layout to activate tracking."
            onChange={(v) => set("googleAnalyticsId", v)}
          />
        </FormSection>

        <div className="border border-white/5 p-5 space-y-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25">Auth</p>
          <p className="text-xs text-white/30">
            Authentication is handled by Supabase Auth — session management via SSR cookies,
            PKCE for password reset, and role-based access in <code className="font-mono text-white/40">lib/auth/</code>.
            Configure env vars in <code className="font-mono text-white/40">.env.local</code>.
          </p>
          <p className="text-xs text-white/20 font-mono">NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</p>
        </div>

        <div className="border border-white/5 p-5 space-y-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25">Business & Providers</p>
          <p className="text-xs text-white/30">
            Distributor, PRO, and provider reference lists are managed in the{" "}
            <Link href="/admin/settings/business" className="text-white/50 hover:text-white underline underline-offset-2 transition-colors">
              Business Settings
            </Link>{" "}
            panel.
          </p>
        </div>

        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} label={saved ? "Saved ✓" : "Save Settings"} />
        </div>
      </div>
    </AdminShell>
  );
}
