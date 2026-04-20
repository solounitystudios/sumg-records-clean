"use client";

/**
 * RegistrationPanel — Reusable service-specific registration status panel.
 *
 * Displays registration workflow and status for DistroKid, BMI, Songtrust,
 * or SoundExchange. All four services lack real-time public APIs — status
 * and reference data are entered and maintained manually.
 */

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegistrationData {
  status: "draft" | "ready" | "submitted" | "confirmed" | "issue" | "live";
  referenceId?: string;
  referenceUrl?: string;
  notes?: string;
  submittedBy?: string;
  submittedAt?: string;
}

export interface RegistrationPanelProps {
  service: "distrokid" | "bmi" | "songtrust" | "soundexchange";
  entityType: "song" | "release";
  entityId: string;
  currentStatus?: RegistrationData["status"];
  referenceId?: string;
  referenceUrl?: string;
  notes?: string;
  lastSynced?: string;
  submittedBy?: string;
  submittedAt?: string;
  onUpdate?: (data: Partial<RegistrationData>) => void;
  readonly?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<RegistrationPanelProps["service"], string> = {
  distrokid: "DistroKid",
  bmi: "BMI",
  songtrust: "Songtrust",
  soundexchange: "SoundExchange",
};

const SERVICE_NOTE: Record<RegistrationPanelProps["service"], string> = {
  distrokid:
    "DistroKid does not provide a real-time public API for third-party integrations. Store your reference ID and update status manually after confirming in the DistroKid dashboard.",
  bmi:
    "BMI does not provide a real-time public API. Registration status and work URLs must be confirmed and entered by your rights team via the BMI Songview portal.",
  songtrust:
    "Songtrust does not provide a real-time public API for third-party integrations. Update registration status manually after confirming in the Songtrust dashboard.",
  soundexchange:
    "SoundExchange does not provide a real-time API. Registration status is entered manually — update after confirming with the rights team via the SoundExchange member portal.",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status?: RegistrationData["status"]): string {
  if (!status || status === "draft") return "border-white/10 text-white/30 bg-white/[0.02]";
  if (status === "ready") return "border-blue-800/40 text-blue-400/60 bg-blue-500/5";
  if (status === "submitted") return "border-yellow-800/40 text-yellow-400/60 bg-yellow-500/5";
  if (status === "confirmed") return "border-purple-800/40 text-purple-400/60 bg-purple-500/5";
  if (status === "live") return "border-green-800/40 text-green-400/60 bg-green-500/5";
  if (status === "issue") return "border-red-800/40 text-red-400/60 bg-red-500/5";
  return "border-white/10 text-white/30 bg-white/[0.02]";
}

const STATUS_OPTIONS: RegistrationData["status"][] = [
  "draft",
  "ready",
  "submitted",
  "confirmed",
  "live",
  "issue",
];

/** Only allow http/https URLs to prevent javascript: XSS via href. */
function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return url;
    }
  } catch {
    // invalid URL — fall through
  }
  return "#";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegistrationPanel({
  service,
  currentStatus,
  referenceId: initialRefId,
  referenceUrl: initialRefUrl,
  notes: initialNotes,
  lastSynced,
  submittedBy,
  submittedAt,
  onUpdate,
  readonly = false,
}: RegistrationPanelProps) {
  const [status, setStatus] = useState<RegistrationData["status"]>(
    currentStatus ?? "draft"
  );
  const [refId, setRefId] = useState(initialRefId ?? "");
  const [refUrl, setRefUrl] = useState(initialRefUrl ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");

  const serviceLabel = SERVICE_LABELS[service];
  const note = SERVICE_NOTE[service];

  function handleStatusChange(next: RegistrationData["status"]) {
    setStatus(next);
    onUpdate?.({ status: next });
  }

  function handleBlurField(field: keyof RegistrationData, value: string) {
    onUpdate?.({ [field]: value || undefined });
  }

  return (
    <div className="border border-white/[0.06] bg-white/[0.01] p-5 space-y-5">
      {/* ── Service header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[9px] tracking-[0.2em] uppercase border border-white/10 px-2 py-0.5 text-white/30">
            {serviceLabel}
          </span>
          <span className="text-[10px] tracking-[0.15em] uppercase text-white/25">
            Registration
          </span>
        </div>
        {/* Status badge */}
        <span
          className={`text-[9px] tracking-[0.1em] uppercase border px-2 py-0.5 ${statusColor(status)}`}
        >
          {status}
        </span>
      </div>

      {/* ── Status selector ─────────────────────────────────────────────── */}
      {!readonly && (
        <div className="space-y-1.5">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`text-[9px] tracking-[0.1em] uppercase border px-2 py-1 transition-colors ${
                  status === s
                    ? statusColor(s)
                    : "border-white/[0.06] text-white/20 hover:text-white/50 hover:border-white/15"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick action buttons ─────────────────────────────────────────── */}
      {!readonly && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusChange("submitted")}
            className="px-3 py-1.5 text-[9px] tracking-[0.15em] uppercase border border-yellow-800/30 text-yellow-400/50 hover:text-yellow-400/80 hover:border-yellow-800/50 transition-colors"
          >
            Mark as Submitted
          </button>
          <button
            onClick={() => handleStatusChange("live")}
            className="px-3 py-1.5 text-[9px] tracking-[0.15em] uppercase border border-green-800/30 text-green-400/50 hover:text-green-400/80 hover:border-green-800/50 transition-colors"
          >
            Mark as Live
          </button>
          <button
            onClick={() => handleStatusChange("issue")}
            className="px-3 py-1.5 text-[9px] tracking-[0.15em] uppercase border border-red-800/30 text-red-400/50 hover:text-red-400/80 hover:border-red-800/50 transition-colors"
          >
            Mark Issue
          </button>
        </div>
      )}

      {/* ── Reference ID ────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/20">
          Reference ID
        </p>
        {readonly ? (
          <p className="text-[11px] font-mono text-white/40">
            {refId || "—"}
          </p>
        ) : (
          <input
            type="text"
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            onBlur={(e) => handleBlurField("referenceId", e.target.value)}
            placeholder="e.g. DK-12345678"
            className="w-full bg-transparent border border-white/[0.08] px-3 py-2 text-[11px] font-mono text-white/60 placeholder:text-white/15 focus:border-white/20 focus:outline-none"
          />
        )}
      </div>

      {/* ── Reference URL ────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/20">
          Reference URL
        </p>
        {readonly ? (
          refUrl ? (
            <a
              href={safeUrl(refUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-white/40 hover:text-white/70 underline underline-offset-2 break-all"
            >
              {refUrl} ↗
            </a>
          ) : (
            <p className="text-[11px] font-mono text-white/20">—</p>
          )
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={refUrl}
              onChange={(e) => setRefUrl(e.target.value)}
              onBlur={(e) => handleBlurField("referenceUrl", e.target.value)}
              placeholder="https://…"
              className="flex-1 bg-transparent border border-white/[0.08] px-3 py-2 text-[11px] font-mono text-white/60 placeholder:text-white/15 focus:border-white/20 focus:outline-none"
            />
            {refUrl && (
              <a
                href={safeUrl(refUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] tracking-[0.1em] uppercase text-white/25 hover:text-white transition-colors flex-shrink-0"
              >
                Open ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/20">
          Notes
        </p>
        {readonly ? (
          <p className="text-[11px] text-white/35 leading-relaxed">
            {notes || "—"}
          </p>
        ) : (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={(e) => handleBlurField("notes", e.target.value)}
            placeholder="Registration notes, issues, follow-up actions…"
            rows={3}
            className="w-full bg-transparent border border-white/[0.08] px-3 py-2 text-[11px] text-white/60 placeholder:text-white/15 focus:border-white/20 focus:outline-none resize-none"
          />
        )}
      </div>

      {/* ── Metadata row ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-6 pt-2 border-t border-white/[0.04]">
        {submittedBy && (
          <div>
            <p className="text-[8px] tracking-[0.2em] uppercase text-white/15">
              Submitted By
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">{submittedBy}</p>
          </div>
        )}
        {submittedAt && (
          <div>
            <p className="text-[8px] tracking-[0.2em] uppercase text-white/15">
              Submitted At
            </p>
            <p className="text-[10px] font-mono text-white/30 mt-0.5">
              {submittedAt.slice(0, 10)}
            </p>
          </div>
        )}
        {lastSynced && (
          <div>
            <p className="text-[8px] tracking-[0.2em] uppercase text-white/15">
              Last Synced
            </p>
            <p className="text-[10px] font-mono text-white/30 mt-0.5">
              {lastSynced.slice(0, 10)}
            </p>
          </div>
        )}
      </div>

      {/* ── Ingestion strategy note ───────────────────────────────────────── */}
      <div className="pt-2 border-t border-white/[0.04]">
        <p className="text-[9px] text-white/20 leading-relaxed">{note}</p>
      </div>
    </div>
  );
}
