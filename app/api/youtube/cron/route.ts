import { type NextRequest, NextResponse } from "next/server"
import { autoScheduleAllActiveChannels } from "@/lib/youtube/scheduler"
import { runProcessor } from "@/lib/youtube/processor"

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
    const [schedulerSummary, processorSummary] = await Promise.all([
      autoScheduleAllActiveChannels(),
      runProcessor(),
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
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export const GET  = handle
export const POST = handle
