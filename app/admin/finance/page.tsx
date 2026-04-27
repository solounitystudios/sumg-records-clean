export const dynamic = "force-dynamic"
export const metadata = { title: "Finance — SUMG Admin" }

import { getTransactions, categoryLabel, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/db/finance"
import { createTransaction, deleteTransaction } from "@/app/actions/finance"

const typeStyle = {
  income:  "bg-emerald-500/15 text-emerald-400",
  expense: "bg-red-500/15 text-red-400",
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

export default async function FinancePage() {
  const transactions = await getTransactions()

  const income  = transactions.filter((t) => t.type === "income")
  const expense = transactions.filter((t) => t.type === "expense")
  const totalIn  = income.reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = expense.reduce((s, t) => s + Number(t.amount), 0)
  const net = totalIn - totalOut

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Finance</h1>
        <p className="mt-2 text-sm text-white/50">Income, expenses, and label cash flow.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-10">
        {[
          { label: "Total Income",   value: fmt(totalIn, "USD"),  color: "text-emerald-400" },
          { label: "Total Expenses", value: fmt(totalOut, "USD"), color: "text-red-400" },
          { label: "Net Balance",    value: fmt(net, "USD"),      color: net >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Transactions",   value: String(transactions.length), color: "text-white" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No transactions yet. Add the first one →
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-sm font-medium">All Transactions</h2>
                <span className="text-xs text-white/35">{transactions.length} records</span>
              </div>
              <div className="divide-y divide-white/5">
                {transactions.map((t) => (
                  <div key={t.id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${typeStyle[t.type]}`}>
                      {t.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.description || categoryLabel(t.category)}</div>
                      <div className="text-xs text-white/35 mt-0.5">
                        {categoryLabel(t.category)}
                        {t.artistSlug && ` · ${t.artistSlug}`}
                        {t.releaseSlug && ` · ${t.releaseSlug}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                        {t.type === "expense" ? "−" : "+"}{fmt(Number(t.amount), t.currency)}
                      </div>
                      <div className="text-xs text-white/35 mt-0.5">{t.transactionDate}</div>
                    </div>
                    <form action={deleteTransaction.bind(null, t.id)}>
                      <button type="submit" className="text-xs text-red-400/40 hover:text-red-400 transition shrink-0">
                        Delete
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 self-start">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">New Transaction</h2>
          <form action={createTransaction} className="space-y-4">
            <div>
              <label htmlFor="f-type" className={labelClass}>Type</label>
              <select id="f-type" name="type" defaultValue="income" className={inputClass}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-category" className={labelClass}>Category</label>
              <select id="f-category" name="category" defaultValue="streaming_royalties" className={inputClass}>
                <optgroup label="Income">
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </optgroup>
                <optgroup label="Expense">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="f-amount" className={labelClass}>Amount</label>
                <input id="f-amount" name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className={inputClass} />
              </div>
              <div>
                <label htmlFor="f-currency" className={labelClass}>Currency</label>
                <select id="f-currency" name="currency" defaultValue="USD" className={inputClass}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="f-date" className={labelClass}>Date</label>
              <input id="f-date" name="transaction_date" type="date" required className={inputClass} />
            </div>

            <div>
              <label htmlFor="f-desc" className={labelClass}>Description</label>
              <input id="f-desc" name="description" type="text" placeholder="e.g. Spotify Q1 royalties" className={inputClass} />
            </div>

            <div>
              <label htmlFor="f-artist" className={labelClass}>Artist Slug (optional)</label>
              <input id="f-artist" name="artist_slug" type="text" placeholder="e.g. zyson" className={inputClass} />
            </div>

            <div>
              <label htmlFor="f-release" className={labelClass}>Release Slug (optional)</label>
              <input id="f-release" name="release_slug" type="text" placeholder="e.g. voltage-ep" className={inputClass} />
            </div>

            <div>
              <label htmlFor="f-notes" className={labelClass}>Notes</label>
              <textarea id="f-notes" name="notes" rows={2} placeholder="Internal notes…" className={`${inputClass} resize-none`} />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Add Transaction
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
