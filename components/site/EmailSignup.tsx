"use client";

import { useState } from "react";
import { subscribeEmail } from "@/app/actions/subscribe";

export function EmailSignup() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const fd = new FormData(e.currentTarget);
    const result = await subscribeEmail(fd);
    if (result.success) {
      setStatus("done");
    } else {
      setErrorMsg(result.error ?? "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="max-w-lg">
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/20 mb-3">
            Stay in the loop
          </p>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight mb-2">
            New drops. No noise.
          </h2>
          <p className="text-sm text-white/40 mb-8 leading-relaxed">
            Be the first to hear new music, exclusive content, and limited
            releases from SUMG Records.
          </p>

          {status === "done" ? (
            <p className="text-sm text-white/60 border border-white/10 px-5 py-4 tracking-wide">
              You&apos;re in —{" "}
              <span className="text-white/80">we&apos;ll be in touch.</span>
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-0">
              <input
                type="hidden"
                name="source"
                value="site"
              />
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                required
                className="flex-1 bg-white/[0.04] border border-white/10 border-r-0 px-4 py-3 text-sm text-white/80 placeholder-white/20 outline-none focus:border-white/25 transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-6 py-3 text-[10px] tracking-[0.25em] uppercase text-black bg-white hover:bg-white/90 disabled:opacity-50 transition-all duration-300 whitespace-nowrap"
              >
                {status === "loading" ? "…" : "Subscribe"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-3 text-xs text-red-400/80">{errorMsg}</p>
          )}
        </div>
      </div>
    </section>
  );
}
