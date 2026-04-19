"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useState } from "react";

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
    // Phase 5: persist to DB / env config
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
            hint="Phase 5: connect to next.config.js or app layout."
            onChange={(v) => set("googleAnalyticsId", v)}
          />
        </FormSection>

        <div className="border border-white/5 p-5 space-y-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25">Auth Configuration</p>
          <p className="text-xs text-white/30">
            Authentication is scaffolded in <code className="font-mono text-white/40">lib/auth/index.ts</code>.
            Connect to Supabase Auth or NextAuth in Phase 4.
          </p>
          <p className="text-xs text-white/20 font-mono">NEXTAUTH_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY</p>
        </div>

        <div className="border border-white/5 p-5 space-y-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25">Database / Storage</p>
          <p className="text-xs text-white/30">
            All data is in-memory for Phase 1–3. Connect Supabase or a Postgres database in Phase 5 to persist all CMS data.
          </p>
          <p className="text-xs text-white/20 font-mono">DATABASE_URL, STORAGE_BUCKET</p>
        </div>

        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} label={saved ? "Saved ✓" : "Save Settings"} />
        </div>
      </div>
    </AdminShell>
  );
}
