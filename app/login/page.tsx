"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  link_expired: "That recovery link has expired. Please request a new one below.",
  auth_error: "Authentication failed. The link may be invalid or already used.",
  missing_code: "No authentication code was found in the link.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam ? (ERROR_MESSAGES[errorParam] ?? "An authentication error occurred.") : null
  );
  const [loading, setLoading] = useState(false);

  // "Forgot password" state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const sb = createClient();
    const { data, error: authError } = await sb.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const ADMIN_ROLES = ["owner", "co_owner", "admin", "editor", "media_manager", "release_manager"];
    const role = (data.user?.app_metadata?.role as string | undefined) ?? "";
    const safeParam = redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : null;
    const destination = safeParam ?? (ADMIN_ROLES.includes(role) ? "/admin" : "/dashboard");

    router.push(destination);
    router.refresh();
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);

    const sb = createClient();
    const siteUrl =
      (typeof window !== "undefined" ? window.location.origin : null) ??
      process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      setForgotError("Unable to determine site URL. Please contact support.");
      setForgotLoading(false);
      return;
    }

    const { error: resetError } = await sb.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${siteUrl}/auth/callback?type=recovery`,
    });

    if (resetError) {
      setForgotError(resetError.message);
    } else {
      setForgotSent(true);
    }
    setForgotLoading(false);
  }

  if (showForgot) {
    return (
      <div className="space-y-4">
        {forgotSent ? (
          <p className="text-[11px] text-green-400 border border-green-900/40 bg-green-950/20 px-3 py-3 text-center">
            Check your email for a password reset link.
          </p>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                Email
              </label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
                placeholder="admin@sumgrecords.com"
              />
            </div>

            {forgotError && (
              <p className="text-[11px] text-red-400 border border-red-900/40 bg-red-950/20 px-3 py-2">
                {forgotError}
              </p>
            )}

            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full bg-white text-black text-[11px] tracking-[0.25em] uppercase py-3.5 font-semibold hover:bg-white/90 transition-colors duration-300 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {forgotLoading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => setShowForgot(false)}
          className="w-full text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors py-1"
        >
          ← Back to sign in
        </button>
      </div>
    );
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
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-[9px] tracking-[0.15em] uppercase text-white/25 hover:text-white/50 transition-colors"
          >
            Forgot?
          </button>
        </div>
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

