"use client"

import { useActionState } from "react"
import { login } from "@/app/actions/auth"

export default function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#06070a] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">SUMG Records</p>
          <h1 className="text-2xl font-semibold text-white">Access Portal</h1>
          <p className="mt-2 text-sm text-white/55">
            Sign in to access the admin panel or artist dashboard.
          </p>
        </div>

        <form action={action} className="space-y-4">
          {returnTo && (
            <input type="hidden" name="returnTo" value={returnTo} />
          )}

          <div>
            <label
              htmlFor="username"
              className="block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="admin or artist slug"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
            />
          </div>

          {state?.error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-white/25">
          SUMG Records internal platform.
        </p>
      </div>
    </main>
  )
}
