"use client";

/**
 * /admin/settings/business
 *
 * Business and provider configuration reference panel.
 * Lists supported distributors, PROs, and other org types.
 * In a future phase this will persist default provider preferences
 * to the database.
 */

import { AdminShell } from "@/components/admin/AdminShell";
import { FormSection } from "@/components/admin/FormField";
import { DISTRIBUTORS, PROS } from "@/components/admin/ProviderPanel";
import Link from "next/link";

const NEIGHBORING_RIGHTS_ORGS = [
  "SoundExchange (US)",
  "PPL (UK)",
  "SOCAN (CA)",
  "RAAP (IE)",
  "GVL (DE)",
  "Other",
];

const PUBLISHING_ADMINS = [
  "Songtrust",
  "Downtown Music Publishing",
  "CD Baby Pro",
  "Kobalt",
  "Other",
];

function ListTable({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="border border-white/[0.06] px-3 py-1.5 text-[11px] text-white/40 tracking-wide"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function BusinessSettingsPage() {
  return (
    <AdminShell title="Settings — Business & Providers">
      <div className="max-w-2xl space-y-10">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/settings"
            className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
          >
            ← Settings
          </Link>
        </div>

        <div className="border border-white/5 p-5 space-y-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
            How Provider Config Works
          </p>
          <p className="text-xs text-white/30 leading-relaxed">
            Provider configuration is stored per-artist and per-release. Edit
            provider settings in{" "}
            <Link
              href="/admin/artists"
              className="text-white/50 hover:text-white underline underline-offset-2 transition-colors"
            >
              Artists
            </Link>{" "}
            or{" "}
            <Link
              href="/admin/releases"
              className="text-white/50 hover:text-white underline underline-offset-2 transition-colors"
            >
              Releases
            </Link>
            . To add a new distributor or PRO, update the{" "}
            <code className="font-mono text-white/40">
              DISTRIBUTORS / PROS
            </code>{" "}
            arrays in{" "}
            <code className="font-mono text-white/40">
              components/admin/ProviderPanel.tsx
            </code>
            . Zero code rewrites required.
          </p>
        </div>

        <FormSection title="Supported Distributors">
          <ListTable items={DISTRIBUTORS} />
        </FormSection>

        <FormSection title="Performing Rights Organizations (PRO)">
          <ListTable items={PROS} />
        </FormSection>

        <FormSection title="Neighboring Rights Organizations">
          <ListTable items={NEIGHBORING_RIGHTS_ORGS} />
        </FormSection>

        <FormSection title="Publishing Administrators">
          <ListTable items={PUBLISHING_ADMINS} />
        </FormSection>

        <FormSection title="Release Submission Statuses">
          <ListTable
            items={[
              "not_submitted",
              "pending",
              "submitted",
              "distributed",
              "rejected",
            ]}
          />
        </FormSection>

        <div className="border border-white/5 p-5 space-y-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25">
            Publishing Workflow
          </p>
          <div className="space-y-1 text-xs text-white/30 leading-relaxed">
            <p>
              1. Set distributor + PRO on the artist and release.
            </p>
            <p>
              2. Enter ISRC and UPC once assigned by the distributor.
            </p>
            <p>
              3. Update submission status as the release moves through the
              distribution pipeline.
            </p>
            <p>
              4. Add DSP links (Spotify, Apple Music…) once the release goes live
              on each platform.
            </p>
            <p>
              5. Use the{" "}
              <Link
                href="/admin/publishing"
                className="text-white/50 hover:text-white underline underline-offset-2"
              >
                Publishing
              </Link>{" "}
              command center to monitor all scheduled and overdue items.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
