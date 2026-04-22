export type ContributorType = "human" | "ai_persona"
export type ContributionRole = "writer" | "co-writer" | "editor" | "ai_assist"
export type LyricProjectStatus = "open" | "in_review" | "approved" | "archived"
export type ApprovalStatus = "approved" | "rejected" | "revision_requested"

export interface Contributor {
  id: string
  name: string
  email: string | null
  type: ContributorType
  royaltyEligible: boolean
  artistSlug: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export interface LyricProject {
  id: string
  title: string
  releaseSlug: string | null
  artistSlug: string | null
  status: LyricProjectStatus
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface LyricDraft {
  id: string
  projectId: string
  version: number
  content: string
  contributorId: string | null
  notes: string | null
  createdAt: string
}

export interface LyricContribution {
  id: string
  projectId: string
  contributorId: string
  contributorName: string
  contributorType: ContributorType
  role: ContributionRole
  splitPercentage: number
  createdAt: string
}

export interface LyricPersonaProfile {
  id: string
  contributorId: string
  styleSummary: string | null
  vocabularyProfile: Record<string, unknown>
  trainingSources: string[]
  createdAt: string
  updatedAt: string
}

export interface LyricApproval {
  id: string
  draftId: string
  approvedBy: string
  status: ApprovalStatus
  notes: string | null
  createdAt: string
}
