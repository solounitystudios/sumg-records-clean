import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import {
  getAllChannels,
  getJobCounts,
  getProcessableJobCount,
  getRecentUploads,
  getFailedJobs,
  getRecentLogs,
} from "@/lib/db/youtube"
import { isOAuthConfigured, getMissingOAuthConfig } from "@/lib/youtube/oauth"
import { ProcessNowPanel } from "@/components/admin/ProcessNowPanel"
import { initiateOAuth, disconnectOAuth, retryFailedJob } from "@/app/actions/ytEngine"

export const metadata = { title: "Upload Engine — SUMG Admin" }

const LOG_STYLE: Record<string, string> = {
  info:  "text-white/40",
  warn:  "text-yellow-400/60",
  error: "text-red-400/60",
}

const LOG_DOT: Record<string, string> = {
  info:  "bg-white/20",
  warn:  "bg-yellow-400/60",
  error: "bg-red-400/70",
}

interface Props {
  searchParams: Promise<{ oauth_success?: string; oauth_error?: string }>
}

export default async function EngineAdminPage({ searchParams }: Props) {
  await requireAdmin()

  const sp = await searchParams
  const oauthError   = sp.oauth_error   ? decodeURIComponent(sp.oauth_error) : null
  const oauthSuccess = sp.oauth_success === "1"

  const oauthReady  = isOAuthConfigured()
  const missingVars = getMissingOAuthConfig()

  const [channels, counts, readyCount, recentUploads, failedJobs, logs] = await Promise.all([
    getAllChannels(),
    getJobCounts(),
    getProcessableJobCount(),
    getRecentUploads(10),
    getFailedJobs(),
    getRecentLogs(30),
  ])

  const connectedChannels = channels.filter(c => c.oauthConnected)

  return (
    <div className="px-6 py-8 max-w-4xl space-y-10">
      {/* Header */}
      <div>
        <Link href="/admin/youtube" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Upload Engine</h1>
        <p className="text-xs text-white/35 mt-1">
          Process pending jobs into real YouTube uploads.
        </p>
      </div>

      {/* OAuth flash messages */}
      {oauthSuccess && (
        <div className="rounded-xl border border-green-500/25 bg-green-500/5 px-4 py-3">
          <p className="text-[11px] text-green-400/80">Channel OAuth connected successfully.</p>
        </div>
      )}
      {oauthError && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-red-400/60 mb-1">OAuth Error</p>
          <p className="text-[11px] text-red-400/70">{oauthError}</p>
        </div>
      )}

      {/* OAuth Setup */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">OAuth Configuration</p>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5">
          {oauthReady ? (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <p className="text-sm text-white/70">Google OAuth configured — uploads enabled</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <p className="text-sm text-yellow-400/80">OAuth not configured — running in Safe Mode</p>
              </div>
              <p className="text-[11px] text-white/35 leading-relaxed">
                Add these environment variables to enable real uploads:
              </p>
              <div className="space-y-1">
                {["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REDIRECT_URI"].map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-none ${missingVars.includes(v) ? "bg-red-400/70" : "bg-green-400/70"}`} />
                    <code className={`text-[11px] font-mono ${missingVars.includes(v) ? "text-red-400/60" : "text-green-400/60"}`}>{v}</code>
                    {missingVars.includes(v) && <span className="text-[10px] text-white/25">missing</span>}
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.05] pt-4 space-y-1.5 text-[11px] text-white/30 leading-relaxed">
                <p>1. Create a project at <span className="font-mono text-white/40">console.cloud.google.com</span></p>
                <p>2. Enable the YouTube Data API v3</p>
                <p>3. Create OAuth 2.0 credentials (Web Application type)</p>
                <p>4. Add redirect URI: <span className="font-mono text-white/40">https://your-domain.com/api/youtube/oauth/callback</span></p>
                <p>5. Set <span className="font-mono text-white/40">YOUTUBE_REDIRECT_URI</span> to match that URI exactly</p>
              </div>
              <div className="border-t border-white/[0.05] pt-4 text-[11px] text-white/30 leading-relaxed space-y-1">
                <p className="font-medium text-white/50">Video file requirements</p>
                <p>YouTube requires <span className="font-mono text-white/50">video/mp4</span> or similar — audio-only assets cannot be uploaded directly.</p>
                <p>Workflow: render beat + loop visual to MP4 → upload to asset bin → assign to job → process.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Channel OAuth connections */}
      {channels.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">Channel Connections</p>
            <span className="text-[10px] text-white/25">{connectedChannels.length}/{channels.length} connected</span>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            {channels.map((ch, i) => (
              <div key={ch.id}
                className={`flex items-center gap-4 px-5 py-4 ${i < channels.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                <div className={`w-2 h-2 rounded-full flex-none ${ch.oauthConnected ? "bg-green-400" : "bg-white/15"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate">{ch.channelHandle ?? ch.channelId}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {ch.oauthConnected
                      ? `Connected ${ch.oauthConnectedAt ? new Date(ch.oauthConnectedAt).toLocaleDateString() : ""}`
                      : "Not connected"}
                  </p>
                </div>
                {ch.oauthConnected ? (
                  <form action={disconnectOAuth}>
                    <input type="hidden" name="channel_id" value={ch.id} />
                    <button type="submit"
                      className="text-[10px] border border-red-500/15 text-red-400/40 hover:border-red-500/30 hover:text-red-400/70 px-2.5 py-1.5 rounded-lg transition-colors">
                      Disconnect
                    </button>
                  </form>
                ) : (
                  <form action={initiateOAuth}>
                    <input type="hidden" name="channel_id" value={ch.id} />
                    <button type="submit"
                      disabled={!oauthReady}
                      className="text-[10px] border border-sky-500/20 text-sky-400/60 hover:border-sky-500/40 hover:text-sky-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      {oauthReady ? "Connect →" : "Needs OAuth Config"}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Queue Status + Process Now */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">Process Engine</p>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 space-y-5">
          {/* Queue counts */}
          <div className="flex flex-wrap gap-6">
            {(["pending", "scheduled", "processing", "needs_asset"] as const).map((s) => (
              <div key={s}>
                <p className="text-[9px] uppercase tracking-[0.12em] text-white/25 mb-1">{s.replace("_", " ")}</p>
                <p className="text-xl font-semibold tabular-nums">{counts[s]}</p>
              </div>
            ))}
            <div>
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/25 mb-1">ready now</p>
              <p className="text-xl font-semibold tabular-nums text-green-400/80">{readyCount}</p>
            </div>
          </div>

          <div className="border-t border-white/[0.05] pt-5">
            <ProcessNowPanel readyCount={readyCount} safeMode={!oauthReady} />
          </div>
        </div>
      </section>

      {/* Recent Uploads */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">Recent Uploads</p>
        {recentUploads.length === 0 ? (
          <p className="text-sm text-white/20 py-6 text-center">No uploads yet.</p>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            {recentUploads.map((job, i) => (
              <div key={job.id}
                className={`flex items-center gap-4 px-5 py-3.5 ${i < recentUploads.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/65 truncate">{job.title ?? job.assetFilename ?? "Untitled"}</p>
                  <p className="text-[10px] text-white/25 mt-0.5">{job.channelHandle ?? "—"}</p>
                </div>
                {job.ytVideoUrl ? (
                  <a href={job.ytVideoUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-mono text-red-400/50 hover:text-red-400 transition-colors whitespace-nowrap">
                    ↗ {job.ytVideoId}
                  </a>
                ) : (
                  <span className="text-[10px] font-mono text-white/20">{job.ytVideoId}</span>
                )}
                <p className="text-[10px] text-white/20 font-mono whitespace-nowrap">
                  {job.uploadedAt ? new Date(job.uploadedAt).toLocaleDateString() : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Failed Jobs */}
      {failedJobs.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">
            Failed Jobs
            <span className="ml-2 text-red-400/60">{failedJobs.length}</span>
          </p>
          <div className="rounded-2xl border border-red-500/10 bg-[#0d1016] overflow-hidden">
            {failedJobs.map((job, i) => (
              <div key={job.id}
                className={`flex items-start gap-4 px-5 py-4 ${i < failedJobs.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/60 truncate">{job.title ?? job.assetFilename ?? "Untitled"}</p>
                  {job.errorMessage && (
                    <p className="text-[10px] text-red-400/50 mt-0.5 line-clamp-2">{job.errorMessage}</p>
                  )}
                  <p className="text-[10px] text-white/20 font-mono mt-0.5">
                    {new Date(job.updatedAt).toLocaleString()}
                  </p>
                </div>
                <form action={retryFailedJob}>
                  <input type="hidden" name="id" value={job.id} />
                  <button type="submit"
                    className="text-[10px] border border-yellow-500/20 text-yellow-400/50 hover:border-yellow-500/40 hover:text-yellow-400/80 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                    Retry →
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Engine Logs */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">Engine Logs</p>
        {logs.length === 0 ? (
          <p className="text-sm text-white/20 py-6 text-center">No logs yet — trigger a run to see activity.</p>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden font-mono">
            {logs.map((log, i) => (
              <div key={log.id}
                className={`flex items-start gap-3 px-5 py-2.5 ${i < logs.length - 1 ? "border-b border-white/[0.03]" : ""}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-none mt-1.5 ${LOG_DOT[log.level]}`} />
                <p className={`text-[11px] flex-1 min-w-0 leading-relaxed ${LOG_STYLE[log.level]}`}>
                  {log.message}
                </p>
                <p className="text-[10px] text-white/15 whitespace-nowrap flex-none">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
