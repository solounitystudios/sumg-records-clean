"use client";

import { useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export default function ContactPage() {
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
    <>
      <Navbar />
      <main>
        <section className="pt-32 pb-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">Get in Touch</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">Contact</h1>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">

              {/* Contact info */}
              <div className="space-y-12">
                {[
                  { label: "General Enquiries", value: "contact@sumgrecords.com" },
                  { label: "Press & Media", value: "press@sumgrecords.com" },
                  { label: "Artist Submissions", value: "artists@sumgrecords.com" },
                  { label: "Brand Partnerships", value: "brands@sumgrecords.com" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">{item.label}</p>
                    <a href={`mailto:${item.value}`} className="text-sm text-white/60 hover:text-white transition-colors duration-300">{item.value}</a>
                  </div>
                ))}
              </div>

              {/* Message form */}
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
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

