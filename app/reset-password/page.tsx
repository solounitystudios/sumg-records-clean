"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null); // null = checking

  // Wait for a valid recovery session before allowing the form to submit.
  // In the PKCE/SSR flow the session is set in cookies by /auth/callback, so:
  //  - getSession() may return it immediately, OR
  //  - onAuthStateChange fires INITIAL_SESSION / PASSWORD_RECOVERY / SIGNED_IN.
  // If neither happens within 5 s the link is expired/invalid.
  useEffect(() => {
    const sb = createClient();
    let resolved = false;

    function resolve(ready: boolean) {
      if (!resolved) {
        resolved = true;
        setSessionReady(ready);
      }
    }

    // Immediate check — covers PKCE flow where session is already in cookies
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) resolve(true);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN"
      ) {
        if (session) resolve(true);
      }
    });

    // Fallback: show "link expired" if no valid session arrives within 5 s
    const timeout = setTimeout(() => resolve(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const sb = createClient();
    const { error: updateError } = await sb.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    // Give the user a moment to read the success message, then go to admin
    redirectTimerRef.current = setTimeout(() => router.push("/admin"), 2000);
  }

  // Cleanup redirect timer if the component unmounts before it fires
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Still waiting for recovery session
  if (sessionReady === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 animate-pulse">
          Verifying link…
        </p>
      </div>
    );
  }

  // Session never arrived — likely an expired / invalid link
  if (sessionReady === false) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <Link
          href="/"
          className="text-white font-black tracking-[0.15em] uppercase text-sm mb-16 hover:text-white/60 transition-colors"
        >
          SUMG <span className="text-white/30 font-light">RECORDS</span>
        </Link>

        <div className="w-full max-w-sm border border-white/[0.08] bg-white/[0.02] p-8 text-center space-y-4">
          <p className="text-[9px] tracking-[0.4em] uppercase text-white/25">
            Password Reset
          </p>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Link Expired
          </h1>
          <p className="text-sm text-white/40 leading-relaxed">
            This password-reset link has expired or is invalid. Please request a
            new one from the login page.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 w-full bg-white text-black text-[11px] tracking-[0.25em] uppercase py-3.5 font-semibold hover:bg-white/90 transition-colors duration-300"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <Link
        href="/"
        className="text-white font-black tracking-[0.15em] uppercase text-sm mb-16 hover:text-white/60 transition-colors"
      >
        SUMG <span className="text-white/30 font-light">RECORDS</span>
      </Link>

      <div className="w-full max-w-sm border border-white/[0.08] bg-white/[0.02] p-8">
        <p className="text-[9px] tracking-[0.4em] uppercase text-white/25 mb-2">
          Admin Access
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white mb-8">
          Set New Password
        </h1>

        {success ? (
          <div className="text-center space-y-3">
            <p className="text-[11px] text-green-400 border border-green-900/40 bg-green-950/20 px-3 py-3">
              Password updated — redirecting to admin…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
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
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
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
