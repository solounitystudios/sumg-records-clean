"use client";

import { useState } from "react";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";

export default function AccessSettingsPage() {
  const user = useAccessUser();
  const [saved, setSaved] = useState(false);

  return (
    <AccessShell
      title="Settings"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Settings" },
      ]}
    >
      <div className="max-w-xl space-y-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Account Settings</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Preferences, security, and notification settings for your ACCESS account.
          </p>
        </div>

        {/* Account info */}
        <div className="border border-white/5 divide-y divide-white/[0.04]">
          <div className="px-5 py-4">
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-1">Account</p>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/30">Role</p>
            <p className="text-[11px] text-white/50">{user.roleLabel}</p>
          </div>
          {user.artistSlug && (
            <div className="flex items-center justify-between px-5 py-3">
              <p className="text-[10px] tracking-[0.15em] uppercase text-white/30">Artist</p>
              <p className="text-[11px] font-mono text-white/50">{user.artistSlug}</p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="border border-white/5 divide-y divide-white/[0.04]">
          <div className="px-5 py-4">
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-1">Notifications</p>
          </div>
          {[
            { label: "Release status updates", desc: "When your releases go live or change status" },
            { label: "Royalty statements", desc: "When new statements are imported by your label" },
            { label: "Team messages", desc: "Direct notes from SUMG staff" },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-[11px] text-white/55">{n.label}</p>
                <p className="text-[9px] text-white/25 mt-0.5">{n.desc}</p>
              </div>
              <label className="relative flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-8 h-4 bg-white/10 peer-checked:bg-white/30 rounded-full transition-colors relative">
                  <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white/50 peer-checked:translate-x-4 rounded-full transition-transform" />
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Security */}
        <div className="border border-white/5 divide-y divide-white/[0.04]">
          <div className="px-5 py-4">
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-1">Security</p>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-[11px] text-white/55">Two-Factor Authentication</p>
              <p className="text-[9px] text-white/25 mt-0.5">Managed through your Supabase account</p>
            </div>
            <span className="text-[9px] tracking-[0.15em] uppercase border border-white/10 text-white/25 px-2 py-1">
              External →
            </span>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSaved(true)}
            className="border border-white/15 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/30 hover:text-white transition-all"
          >
            Save Preferences
          </button>
          {saved && (
            <p className="text-[10px] text-green-400/70 tracking-[0.1em] uppercase">Saved.</p>
          )}
        </div>

        {/* Sign out */}
        <div className="pt-4 border-t border-white/[0.06]">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-red-400/60 transition-colors"
            >
              Sign Out of ACCESS
            </button>
          </form>
        </div>
      </div>
    </AccessShell>
  );
}
