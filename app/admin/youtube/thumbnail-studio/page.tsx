import { requireAdmin } from "@/lib/auth"
import { getJobsForStudio } from "@/lib/youtube/thumbnails/actions"
import { getProducers } from "@/lib/db/producers"
import { isImageGenerationConfigured } from "@/lib/image-generation"
import { ThumbnailStudioClient } from "./ThumbnailStudioClient"

export const metadata = { title: "Thumbnail Studio — SUMG Admin" }

export default async function ThumbnailStudioPage() {
  await requireAdmin()

  const [jobs, allProducers] = await Promise.all([
    getJobsForStudio(),
    getProducers(),
  ])

  const producers = allProducers
    .filter((p) => !p.status || p.status === "active")
    .map((p) => ({ slug: p.slug, name: p.name }))

  return (
    <ThumbnailStudioClient
      initialJobs={jobs}
      producers={producers}
      generationEnabled={isImageGenerationConfigured()}
    />
  )
}
