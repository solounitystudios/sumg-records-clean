"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    const mailtoUrl = `mailto:contact@sumgrecords.com?subject=${encodeURIComponent(subject || "Enquiry")}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-6">Send a Message</p>
      <div>
        <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
          placeholder="Name"
        />
      </div>
      <div>
        <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
          placeholder="Email"
        />
      </div>
      <div>
        <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
          placeholder="Subject"
        />
      </div>
      <div>
        <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Message</label>
        <textarea
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300 resize-none"
          placeholder="Your message..."
        />
      </div>
      <button
        type="submit"
        className="border border-white/20 text-white/60 text-[10px] tracking-[0.3em] uppercase px-8 py-3 hover:border-white/40 hover:text-white transition-colors"
      >
        {sent ? "Opening email client…" : "Send Message"}
      </button>
    </form>
  );
}
