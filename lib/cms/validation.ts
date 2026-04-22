import { CMSSong, CMSRelease } from "@/lib/types";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "critical" | "warning" | "info";
}

/**
 * Validates a single song for registration readiness.
 * Returns an array of issues — empty means the song is ready.
 */
export function validateForRegistration(song: CMSSong): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const rm = song.rightsMetadata;

  // Songwriter credits
  if (!rm?.songwriterCredits || rm.songwriterCredits.length === 0) {
    issues.push({
      field: "rightsMetadata.songwriterCredits",
      message: "No songwriter credits on file. Required for PRO registration.",
      severity: "critical",
    });
  }

  // PRO
  if (!rm?.pro) {
    issues.push({
      field: "rightsMetadata.pro",
      message: "No Performing Rights Organization (PRO) assigned.",
      severity: "warning",
    });
  }

  // IPI / CAE
  if (!rm?.ipiCae) {
    issues.push({
      field: "rightsMetadata.ipiCae",
      message: "IPI/CAE number not set for primary rights holder.",
      severity: "info",
    });
  }

  // Publisher
  if (!rm?.publisher) {
    issues.push({
      field: "rightsMetadata.publisher",
      message: "Publisher not assigned.",
      severity: "info",
    });
  }

  // ISRC
  if (!song.isrc) {
    issues.push({
      field: "isrc",
      message: "ISRC not set. Required for distribution and SoundExchange registration.",
      severity: "warning",
    });
  }

  // Composition status
  if (!rm?.compositionStatus || rm.compositionStatus === "draft") {
    issues.push({
      field: "rightsMetadata.compositionStatus",
      message: "Composition status is draft or missing. Registration has not been initiated.",
      severity: "warning",
    });
  }

  // Audio
  if (!song.audioUrl && !song.mediaAssetId) {
    issues.push({
      field: "audioUrl",
      message: "No audio file attached. Required before distribution submission.",
      severity: "warning",
    });
  }

  return issues;
}

/**
 * Validates a release for distribution readiness.
 * Returns an array of issues — empty means the release is ready.
 */
export function validateReleaseForDistribution(release: CMSRelease): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // UPC
  const hasUPC =
    Boolean(release.distributionRecord?.upc) ||
    Boolean(release.providerConfig?.upc);
  if (!hasUPC) {
    issues.push({
      field: "distributionRecord.upc",
      message: "UPC not assigned. Required for distribution to DSPs.",
      severity: "warning",
    });
  }

  // Cover art
  if (!release.coverArtUrl) {
    issues.push({
      field: "coverArtUrl",
      message: "Cover art is missing. Required for all distribution submissions.",
      severity: "critical",
    });
  }

  // Distributor
  const hasDistributor =
    Boolean(release.distributionRecord?.distributor) ||
    Boolean(release.providerConfig?.distributor);
  if (!hasDistributor) {
    issues.push({
      field: "distributionRecord.distributor",
      message: "No distributor assigned.",
      severity: "warning",
    });
  }

  // Release date
  if (!release.releaseDate) {
    issues.push({
      field: "releaseDate",
      message: "Release date is not set. Required before submission.",
      severity: "critical",
    });
  }

  // Tracklist
  if (!release.tracklist || release.tracklist.length === 0) {
    issues.push({
      field: "tracklist",
      message: "Tracklist is empty. At least one song must be linked.",
      severity: "warning",
    });
  }

  return issues;
}
