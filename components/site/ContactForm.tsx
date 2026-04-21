"use client";

import { useState, useTransition } from "react";
import { submitContact } from "@/app/actions/contact";

const FIELDS = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "subject", label: "Subject", type: "text", required: false },
] as const;

export function ContactForm({
  defaultSubject,
}: {
  defaultSubject?: string;
}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await submitContact(data);
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
      <div className="border border-white/10 px-6 py-10 text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/30 mb-2">
          Message Received
        </p>
        <p className="text-sm text-white/60 leading-relaxed">
          We&apos;ll be in touch within 2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-6">
        Send a Message
      </p>
      {FIELDS.map(({ name, label, type, required }) => (
        <div key={name}>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
            {label}
          </label>
          <input
            type={type}
            name={name}
            required={required}
            defaultValue={name === "subject" ? defaultSubject : undefined}
            className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
            placeholder={label}
          />
        </div>
      ))}
      <div>
        <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
          Message
        </label>
        <textarea
          name="message"
          rows={6}
          required
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300 resize-none"
          placeholder="Your message..."
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="border border-white/20 text-white text-[10px] tracking-[0.3em] uppercase px-8 py-3 hover:border-white/40 hover:bg-white/[0.04] disabled:opacity-50 transition-all duration-300"
      >
        {isPending ? "Sending..." : "Send Message"}
      </button>
      {status === "error" && (
        <p className="text-[10px] text-red-400/70 mt-2">{errorMsg}</p>
      )}
    </form>
  );
}
