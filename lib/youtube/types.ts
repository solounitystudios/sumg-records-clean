// Shared types for the YouTube upload engine.
// No server-only imports so these can be used in both server and client modules.

export interface ProcessResult {
  jobId:     string
  title:     string
  status:    "uploaded" | "failed" | "skipped"
  videoId?:  string
  videoUrl?: string
  error?:    string
  simulated: boolean
}

export interface ProcessSummary {
  processed: number
  uploaded:  number
  failed:    number
  skipped:   number
  results:   ProcessResult[]
  safeMode:  boolean
}
