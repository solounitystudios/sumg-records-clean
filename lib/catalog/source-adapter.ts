/**
 * Provider-neutral source adapter interface (Part 16). This is a contract
 * only — no implementation for any real provider ships in this pass (no BMI/
 * CSV/Distro wiring, no Suno access, per Part 33). Existing importers in
 * lib/imports/* remain the reused implementation for CSV/BMI/Distro; a future
 * pass may have them implement this interface rather than being replaced.
 */

export interface SourceRef {
  sourceId: string;
  externalRef: string;
}

export interface SourceMetadata {
  title: string | null;
  artist: string | null;
  isrc: string | null;
  duration: number | null;
  raw: Record<string, unknown>;
}

export interface SourceMasterRef {
  bytesRef: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SourceStemRef {
  label: string;
  bytesRef: string;
}

export interface SourceArtworkRef {
  bytesRef: string;
  mimeType: string;
}

export interface SourceProvenance {
  observedAt: string;
  provider: string;
  sourceVersion?: string;
}

export interface CatalogSourceAdapter {
  discover(): Promise<SourceRef[]>;
  getMetadata(ref: SourceRef): Promise<SourceMetadata>;
  getMaster(ref: SourceRef): Promise<SourceMasterRef | null>;
  getStems(ref: SourceRef): Promise<SourceStemRef[]>;
  getArtwork(ref: SourceRef): Promise<SourceArtworkRef | null>;
  getLyrics(ref: SourceRef): Promise<string | null>;
  getPromptMetadata(ref: SourceRef): Promise<Record<string, unknown>>;
  getProvenance(ref: SourceRef): Promise<SourceProvenance>;
}

/**
 * A minimal, deterministic in-memory adapter used only to prove the
 * interface is implementable without any real provider, and to give the test
 * suite a provider-neutral fixture. Not a real source connector.
 */
export function createFixtureSourceAdapter(fixture: {
  provider: string;
  refs: SourceRef[];
  metadata: Record<string, SourceMetadata>;
  /** Explicit clock — no hidden `new Date()` inside this deterministic fixture. Same input + same clock must produce the same output. */
  now: () => string;
}): CatalogSourceAdapter {
  return {
    async discover() {
      return fixture.refs;
    },
    async getMetadata(ref) {
      const meta = fixture.metadata[ref.externalRef];
      if (!meta) throw new Error(`No fixture metadata for ${ref.externalRef}`);
      return meta;
    },
    async getMaster() {
      return null;
    },
    async getStems() {
      return [];
    },
    async getArtwork() {
      return null;
    },
    async getLyrics() {
      return null;
    },
    async getPromptMetadata() {
      return {};
    },
    async getProvenance(ref) {
      return { observedAt: fixture.now(), provider: fixture.provider, sourceVersion: ref.sourceId };
    },
  };
}
