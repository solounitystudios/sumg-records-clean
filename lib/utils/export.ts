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
