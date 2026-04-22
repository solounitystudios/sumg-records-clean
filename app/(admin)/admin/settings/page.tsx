"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const SITE_CONFIG_ID = "global";

interface SiteSettings {
  siteName: string;
  siteTagline: string;
  contactEmail: string;
  instagramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  googleAnalyticsId: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "SUMG Records",
  siteTagline: "Sound. Vision. Culture.",
  contactEmail: "",
  instagramUrl: "",
  twitterUrl: "",
  youtubeUrl: "",
  googleAnalyticsId: "",
};

export default function AdminSettings() {
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load persisted settings on mount
  useEffect(() => {
    const sb = createClient();
    sb.from("site_config")
      .select("site_settings")
      .eq("id", SITE_CONFIG_ID)
      .single()
      .then(({ data }: { data: { site_settings: unknown } | null }) => {
        if (data?.site_settings && typeof data.site_settings === "object") {
          setForm((prev: SiteSettings) => ({
            ...prev,
            ...(data.site_settings as Partial<SiteSettings>),
          }));
        }
      })
      .catch(() => {
        // Settings load failure is non-fatal; the form will use defaults.
      });
  }, []);

  function set(key: keyof SiteSettings, value: string) {
    setForm((prev: SiteSettings) => ({ ...prev, [key]: value }));
    setSaved(false);
    setSaveError(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const sb = createClient();
    const { error } = await sb
      .from("site_config")
      .upsert({ id: SITE_CONFIG_ID, site_settings: form });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
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

        {saveError && (
          <p className="text-[11px] text-red-400 border border-red-900/40 bg-red-950/20 px-3 py-2">
            {saveError}
          </p>
        )}

        <div className="pt-4 border-t border-white/5">
          <SaveButton
            onClick={handleSave}
            label={saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
          />
        </div>
      </div>
    </AdminShell>
  );
}

