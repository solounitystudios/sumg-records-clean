export const dynamic = "force-dynamic"
export const metadata = { title: "Contracts — SUMG Admin" }

import { getContracts, CONTRACT_TYPES, CONTRACT_STATUSES } from "@/lib/db/contracts"
import { createContract, deleteContract } from "@/app/actions/contracts"

const statusStyle: Record<string, string> = {
  draft:   "bg-white/8 text-white/40",
  sent:    "bg-blue-500/15 text-blue-400",
  signed:  "bg-emerald-500/15 text-emerald-400",
  expired: "bg-white/5 text-white/25",
  void:    "bg-red-500/15 text-red-400",
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

function fmtType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export default async function ContractsPage() {
  const contracts = await getContracts()

  const counts = CONTRACT_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: contracts.filter((c) => c.status === s).length }),
    {} as Record<string, number>,
  )

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Contracts</h1>
        <p className="mt-2 text-sm text-white/50">Recording, distribution, sync, and business agreements.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-5 mb-10">
        {[
          { label: "Total",   value: contracts.length },
          { label: "Draft",   value: counts.draft ?? 0 },
          { label: "Sent",    value: counts.sent ?? 0 },
          { label: "Signed",  value: counts.signed ?? 0 },
          { label: "Expired", value: counts.expired ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {contracts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No contracts yet. Add the first one →
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-sm font-medium">All Contracts</h2>
                <span className="text-xs text-white/35">{contracts.length} records</span>
              </div>
              <div className="divide-y divide-white/5">
                {contracts.map((c) => (
                  <div key={c.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[c.status] ?? statusStyle.draft}`}>
                            {c.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/30">
                            {fmtType(c.type)}
                          </span>
                          <span className="text-sm font-medium">{c.title}</span>
                        </div>
                        <div className="text-xs text-white/35 space-x-3">
                          {c.counterparty && <span>with {c.counterparty}</span>}
                          {c.artistSlug && <span>· {c.artistSlug}</span>}
                          {c.effectiveDate && <span>· eff. {c.effectiveDate}</span>}
                          {c.expiryDate && <span>· exp. {c.expiryDate}</span>}
                        </div>
                      </div>
                      <form action={deleteContract.bind(null, c.id)}>
                        <button type="submit" className="text-xs text-red-400/40 hover:text-red-400 transition shrink-0">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 self-start">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">New Contract</h2>
          <form action={createContract} className="space-y-4">
            <div>
              <label htmlFor="ct-title" className={labelClass}>Title</label>
              <input id="ct-title" name="title" type="text" required placeholder="e.g. Zyson Recording Agreement" className={inputClass} />
            </div>

            <div>
              <label htmlFor="ct-type" className={labelClass}>Type</label>
              <select id="ct-type" name="type" defaultValue="recording" className={inputClass}>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>{fmtType(t)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ct-status" className={labelClass}>Status</label>
              <select id="ct-status" name="status" defaultValue="draft" className={inputClass}>
                {CONTRACT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ct-counterparty" className={labelClass}>Counterparty</label>
              <input id="ct-counterparty" name="counterparty" type="text" placeholder="Company or individual name" className={inputClass} />
            </div>

            <div>
              <label htmlFor="ct-artist" className={labelClass}>Artist Slug</label>
              <input id="ct-artist" name="artist_slug" type="text" placeholder="e.g. zyson" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ct-eff" className={labelClass}>Effective</label>
                <input id="ct-eff" name="effective_date" type="date" className={inputClass} />
              </div>
              <div>
                <label htmlFor="ct-exp" className={labelClass}>Expires</label>
                <input id="ct-exp" name="expiry_date" type="date" className={inputClass} />
              </div>
            </div>

            <div>
              <label htmlFor="ct-notes" className={labelClass}>Notes</label>
              <textarea id="ct-notes" name="notes" rows={2} placeholder="Internal notes…" className={`${inputClass} resize-none`} />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Create Contract
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
