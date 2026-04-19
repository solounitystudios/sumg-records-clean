"use client";

/**
 * components/admin/ProviderPanel.tsx
 *
 * Configurable provider / business config panel for artists and releases.
 * All provider names are driven by data — no hardcoded DistroKid or BMI.
 * Adding a new distributor or PRO requires only updating the DISTRIBUTORS /
 * PROS arrays.
 */

import { ProviderConfig } from "@/lib/types";
import { FormField } from "@/components/admin/FormField";

// ─── Provider lists ──────────────────────────────────────────────────────────

export const DISTRIBUTORS: string[] = [
  "DistroKid",
  "TuneCore",
  "CD Baby",
  "Stem",
  "AWAL",
  "UnitedMasters",
  "Other",
];

export const PROS: string[] = [
  "BMI",
  "ASCAP",
  "SESAC",
  "PRS",
  "SOCAN",
  "Other",
];

const SUBMISSION_STATUS_OPTIONS = [
  { value: "not_submitted", label: "Not Submitted" },
  { value: "pending",       label: "Pending" },
  { value: "submitted",     label: "Submitted" },
  { value: "distributed",   label: "Distributed" },
  { value: "rejected",      label: "Rejected" },
];

const SOUND_EXCHANGE_OPTIONS = [
  { value: "registered",     label: "Registered" },
  { value: "pending",        label: "Pending" },
  { value: "not_registered", label: "Not Registered" },
];

interface ProviderPanelProps {
  value: ProviderConfig;
  onChange: (value: ProviderConfig) => void;
  /** "release" | "artist" — controls which fields to show */
  context?: "release" | "artist";
}

export function ProviderPanel({
  value,
  onChange,
  context = "release",
}: ProviderPanelProps) {
  function set<K extends keyof ProviderConfig>(
    key: K,
    val: ProviderConfig[K]
  ) {
    onChange({ ...value, [key]: val || undefined });
  }

  return (
    <div className="space-y-4">
      {/* Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            Distributor
          </p>
          <select
            value={value.distributor ?? ""}
            onChange={(e) => set("distributor", e.target.value)}
            className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
          >
            <option value="" className="bg-neutral-900">
              — Not Set —
            </option>
            {DISTRIBUTORS.map((d) => (
              <option key={d} value={d} className="bg-neutral-900">
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            PRO (Performing Rights Org)
          </p>
          <select
            value={value.pro ?? ""}
            onChange={(e) => set("pro", e.target.value)}
            className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
          >
            <option value="" className="bg-neutral-900">
              — Not Set —
            </option>
            {PROS.map((p) => (
              <option key={p} value={p} className="bg-neutral-900">
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="text"
          label="Publishing Admin"
          value={value.publishingAdmin ?? ""}
          placeholder="e.g. Songtrust, Downtown"
          onChange={(v) => set("publishingAdmin", v)}
        />
        <FormField
          type="text"
          label="Neighboring Rights Org"
          value={value.neighboringRightsOrg ?? ""}
          placeholder="e.g. SoundExchange, RAAP"
          onChange={(v) => set("neighboringRightsOrg", v)}
        />
      </div>

      {/* SoundExchange */}
      <div>
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
          SoundExchange Status
        </p>
        <select
          value={value.soundExchangeStatus ?? ""}
          onChange={(e) =>
            set(
              "soundExchangeStatus",
              (e.target.value ||
                undefined) as ProviderConfig["soundExchangeStatus"]
            )
          }
          className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
        >
          <option value="" className="bg-neutral-900">
            — Not Set —
          </option>
          {SOUND_EXCHANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-neutral-900">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Release-specific fields */}
      {context === "release" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              type="text"
              label="ISRC"
              value={value.isrc ?? ""}
              placeholder="e.g. USRC12345678"
              mono
              onChange={(v) => set("isrc", v)}
            />
            <FormField
              type="text"
              label="UPC"
              value={value.upc ?? ""}
              placeholder="e.g. 012345678901"
              mono
              onChange={(v) => set("upc", v)}
            />
          </div>

          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
              Submission Status
            </p>
            <select
              value={value.submissionStatus ?? ""}
              onChange={(e) =>
                set(
                  "submissionStatus",
                  (e.target.value ||
                    undefined) as ProviderConfig["submissionStatus"]
                )
              }
              className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="" className="bg-neutral-900">
                — Not Set —
              </option>
              {SUBMISSION_STATUS_OPTIONS.map((o) => (
                <option
                  key={o.value}
                  value={o.value}
                  className="bg-neutral-900"
                >
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Notes */}
      <FormField
        type="textarea"
        label="Provider Notes"
        rows={3}
        value={value.providerNotes ?? ""}
        placeholder="Internal notes about distribution, rights, or submission status…"
        onChange={(v) => set("providerNotes", v)}
      />
    </div>
  );
}
