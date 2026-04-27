import { type NextRequest, NextResponse } from "next/server"
import { autoScheduleAllActiveChannels } from "@/lib/youtube/scheduler"
import { runProcessor } from "@/lib/youtube/processor"
import { runAnalyticsSync } from "@/lib/youtube/analytics"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

function isAuthorized(req: NextRequest): boolean {
  if (!CRON_SECRET) return false

  const auth   = req.headers.get("authorization") ?? ""
  const secret = req.nextUrl.searchParams.get("secret") ?? ""

  return auth === `Bearer ${CRON_SECRET}` || (secret !== "" && secret === CRON_SECRET)
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [schedulerSummary, processorSummary, analyticsSummary] = await Promise.all([
      autoScheduleAllActiveChannels().catch((err) => {
        console.error("[cron] scheduler failed:", err)
        return { channels: 0, totalScheduled: 0, results: [] }
      }),
      runProcessor().catch((err) => {
        console.error("[cron] processor failed:", err)
        return { processed: 0, uploaded: 0, failed: 0, skipped: 0, results: [], safeMode: false }
      }),
      runAnalyticsSync(200).catch((err) => {
        console.error("[cron] analytics failed:", err)
        return { videosSynced: 0, videosSkipped: 0, channelsSynced: 0, channelsSkipped: 0, errors: [String(err)] }
      }),
    ])

    return NextResponse.json({
      ok:        true,
      timestamp: new Date().toISOString(),
      scheduler: {
        channels:       schedulerSummary.channels,
        totalScheduled: schedulerSummary.totalScheduled,
        results:        schedulerSummary.results,
      },
      processor: {
        processed: processorSummary.processed,
        uploaded:  processorSummary.uploaded,
        failed:    processorSummary.failed,
        skipped:   processorSummary.skipped,
        safeMode:  processorSummary.safeMode,
      },
      analytics: {
        videosSynced:    analyticsSummary.videosSynced,
        videosSkipped:   analyticsSummary.videosSkipped,
        channelsSynced:  analyticsSummary.channelsSynced,
        channelsSkipped: analyticsSummary.channelsSkipped,
        errors:          analyticsSummary.errors,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export const GET  = handle
export const POST = handle
