"use client";

import { useState, useTransition } from "react";
import { subscribeEmail } from "@/app/actions/subscribe";

interface Props {
  source?: string;
  variant?: "inline" | "stacked";
  heading?: string;
  subtext?: string;
}

export function EmailCapture({
  source = "site",
  variant = "inline",
  heading,
  subtext,
}: Props) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("source", source);

    startTransition(async () => {
      const result = await subscribeEmail(data);
      if (result.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Something went wrong.");
      }
    });
  }

  if (status === "success") {
    return (
      <div className="text-[11px] tracking-[0.2em] uppercase text-white/50 py-2">
        You&apos;re in. ✓
      </div>
    );
  }

  return (
    <div>
      {heading && (
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-3">
          {heading}
        </p>
      )}
      {subtext && <p className="text-xs text-white/35 mb-4">{subtext}</p>}
      <form
        onSubmit={handleSubmit}
        className={
          variant === "inline"
            ? "flex flex-col sm:flex-row gap-2"
            : "flex flex-col gap-2"
        }
      >
        <input
          type="email"
          name="email"
          required
          placeholder="your@email.com"
          className="flex-1 bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-white/30 focus:outline-none transition-colors duration-300"
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-white text-black text-[10px] tracking-[0.25em] uppercase px-6 py-2.5 hover:bg-white/90 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isPending ? "..." : "Subscribe"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-[10px] text-red-400/70 mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
