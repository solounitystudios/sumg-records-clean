import { CMSSong, CMSRelease } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cells: (string | number | undefined | null)[]): string {
  return cells.map(escapeCSV).join(",");
}

function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Catalog CSV ──────────────────────────────────────────────────────────────

/**
 * Exports a combined catalog CSV (songs + releases) and triggers a browser download.
 * Columns: Type, Title, Artist, Release, Status, ISRC/UPC, Distributor, PRO, Source, Updated At
 */
export function exportCatalogToCSV(songs: CMSSong[], releases: CMSRelease[]): void {
  const headers = [
    "Type",
    "Title",
    "Artist",
    "Release",
    "Status",
    "ISRC/UPC",
    "Distributor",
    "PRO",
    "Source",
    "Updated At",
  ];

  const songRows = songs.map((s) =>
    row([
      "Song",
      s.title,
      s.artistName,
      s.releaseName ?? "",
      s.status,
      s.isrc ?? "",
      "",
      s.rightsMetadata?.pro ?? "",
      s.dataSource ?? "",
      s.updatedAt?.slice(0, 10) ?? "",
    ])
  );

  const releaseRows = releases.map((r) =>
    row([
      r.type,
      r.title,
      r.artistName,
      "",
      r.status,
      r.distributionRecord?.upc ?? r.providerConfig?.upc ?? "",
      r.distributionRecord?.distributor ?? r.providerConfig?.distributor ?? "",
      r.rightsMetadata?.pro ?? (r.providerConfig?.pro as string | undefined) ?? "",
      r.dataSource ?? "",
      r.updatedAt?.slice(0, 10) ?? "",
    ])
  );

  const csv = [headers.join(","), ...songRows, ...releaseRows].join("\n");
  triggerDownload(csv, `sumg-catalog-${new Date().toISOString().slice(0, 10)}.csv`);
}

// ─── Rights CSV ───────────────────────────────────────────────────────────────

/**
 * Exports a rights / publishing CSV for all songs and triggers a browser download.
 * Columns: Title, Artist, PRO, IPI/CAE, Publisher, Songwriter Credits, Composition Status,
 *          Registration Status, Last Verified
 */
export function exportRightsToCSV(songs: CMSSong[]): void {
  const headers = [
    "Title",
    "Artist",
    "PRO",
    "IPI/CAE",
    "Publisher",
    "Songwriter Credits",
    "Composition Status",
    "Registration Status",
    "Last Verified",
  ];

  const songRows = songs.map((s) => {
    const rm = s.rightsMetadata;
    const credits = rm?.songwriterCredits
      ? rm.songwriterCredits
          .map((c) => `${c.name} (${c.role}${c.splitPct ? ` ${c.splitPct}%` : ""})`)
          .join("; ")
      : "";
    return row([
      s.title,
      s.artistName,
      rm?.pro ?? "",
      rm?.ipiCae ?? "",
      rm?.publisher ?? "",
      credits,
      rm?.compositionStatus ?? "",
      rm?.registrationStatus ?? "",
      rm?.lastVerified ?? "",
    ]);
  });

  const csv = [headers.join(","), ...songRows].join("\n");
  triggerDownload(csv, `sumg-rights-${new Date().toISOString().slice(0, 10)}.csv`);
}

// ─── Distribution CSV ─────────────────────────────────────────────────────────

/**
 * Exports a distribution tracking CSV for all releases and triggers a browser download.
 * Columns: Title, Artist, Type, Release Status, Distribution Status, Distributor,
 *          UPC, DSP Links, Ref ID, Release Date
 */
export function exportDistributionToCSV(releases: CMSRelease[]): void {
  const headers = [
    "Title",
    "Artist",
    "Type",
    "Release Status",
    "Distribution Status",
    "Distributor",
    "UPC",
    "DSP Links",
    "Ref ID",
    "Release Date",
  ];

  const releaseRows = releases.map((r) => {
    const dr = r.distributionRecord;
    const liveStatus =
      dr?.liveStatus ??
      (r.providerConfig?.submissionStatus === "distributed"
        ? "live"
        : r.providerConfig?.submissionStatus === "submitted"
        ? "submitted"
        : r.providerConfig?.submissionStatus === "pending"
        ? "queued"
        : "draft");
    const dspLinks = r.dspLinks
      ? Object.values(r.dspLinks).filter(Boolean).join("; ")
      : "";
    return row([
      r.title,
      r.artistName,
      r.type,
      r.status,
      liveStatus,
      dr?.distributor ?? r.providerConfig?.distributor ?? "",
      dr?.upc ?? r.providerConfig?.upc ?? "",
      dspLinks,
      dr?.distroReferenceId ?? "",
      r.releaseDate ? r.releaseDate.slice(0, 10) : "",
    ]);
  });

  const csv = [headers.join(","), ...releaseRows].join("\n");
  triggerDownload(csv, `sumg-distribution-${new Date().toISOString().slice(0, 10)}.csv`);
}

// ─── Catalog JSON ─────────────────────────────────────────────────────────────

/**
 * Exports a JSON download of the full catalog (songs + releases).
 */
export function exportCatalogToJSON(songs: CMSSong[], releases: CMSRelease[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    songs: songs.map(s => ({ ...s })),
    releases: releases.map(r => ({ ...r })),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sumg-catalog-${new Date().toISOString().slice(0, 10)}.json`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Rights JSON ──────────────────────────────────────────────────────────────

/**
 * Exports a JSON download of rights metadata for all songs.
 */
export function exportRightsToJSON(songs: CMSSong[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    songs: songs.map(s => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      artistName: s.artistName,
      isrc: s.isrc,
      rightsMetadata: s.rightsMetadata,
      dataSource: s.dataSource,
      updatedAt: s.updatedAt,
    })),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sumg-rights-${new Date().toISOString().slice(0, 10)}.json`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Copy-ready metadata ──────────────────────────────────────────────────────

/**
 * Returns a formatted text block with all metadata for a single song,
 * suitable for pasting into a DistroKid, BMI, Songtrust, or SoundExchange form.
 */
export function getCopyReadyMetadata(song: CMSSong): string {
  const rm = song.rightsMetadata;
  const credits = rm?.songwriterCredits
    ? rm.songwriterCredits
        .map(c => `  - ${c.name} (${c.role}${c.splitPct !== undefined ? `, ${c.splitPct}%` : ""}${c.ipi ? `, IPI: ${c.ipi}` : ""})`)
        .join("\n")
    : "  (none on file)";

  return `SUMG Records — Song Metadata Export
=====================================
Title:            ${song.title}
Artist:           ${song.artistName}
ISRC:             ${song.isrc ?? "(not set)"}
Release:          ${song.releaseName ?? "(standalone)"}
Genre:            ${song.genre ?? "(not set)"}
Explicit:         ${song.isExplicit ? "Yes" : "No"}
Status:           ${song.status}

RIGHTS / PUBLISHING
-------------------
PRO:              ${rm?.pro ?? "(not set)"}
IPI/CAE:          ${rm?.ipiCae ?? "(not set)"}
Publisher:        ${rm?.publisher ?? "(not set)"}
Publishing Admin: ${rm?.publishingAdmin ?? "(not set)"}
Comp. Status:     ${rm?.compositionStatus ?? "(not set)"}
Reg. Status:      ${rm?.registrationStatus ?? "(not set)"}
Last Verified:    ${rm?.lastVerified ?? "(not set)"}

Songwriter Credits:
${credits}

BMI Work URL:     ${rm?.bmiWorkUrl ?? "(not set)"}
ASCAP Work URL:   ${rm?.ascapWorkUrl ?? "(not set)"}
Songview URL:     ${rm?.songviewUrl ?? "(not set)"}
Notes:            ${rm?.rightsNotes ?? "(none)"}

DATA
----
Source:           ${song.dataSource ?? "manual"}
Updated:          ${song.updatedAt?.slice(0, 10) ?? "(unknown)"}
`;
}
