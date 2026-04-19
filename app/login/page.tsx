"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const sb = createClient();
    const { error: authError } = await sb.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
          placeholder="admin@sumgrecords.com"
        />
      </div>
      <div>
        <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
        />
      </div>

      {error && (
        <p className="text-[11px] text-red-400 border border-red-900/40 bg-red-950/20 px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black text-[11px] tracking-[0.25em] uppercase py-3.5 font-semibold hover:bg-white/90 transition-colors duration-300 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing In…" : "Sign In"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <Link
        href="/"
        className="text-white font-black tracking-[0.15em] uppercase text-sm mb-16 hover:text-white/60 transition-colors"
      >
        SUMG <span className="text-white/30 font-light">RECORDS</span>
      </Link>

      <div className="w-full max-w-sm border border-white/[0.08] bg-white/[0.02] p-8">
        <p className="text-[9px] tracking-[0.4em] uppercase text-white/25 mb-2">Admin Access</p>
        <h1 className="text-2xl font-black tracking-tight text-white mb-8">Sign In</h1>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="text-[10px] text-white/20 text-center mt-6">
          Access restricted to SUMG operators.
        </p>
      </div>

      <Link
        href="/"
        className="mt-8 text-[10px] tracking-[0.2em] uppercase text-white/20 hover:text-white/50 transition-colors"
      >
        ← Back to site
      </Link>
    </div>
  );
}

