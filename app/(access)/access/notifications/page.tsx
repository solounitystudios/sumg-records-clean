"use client";

import { useState } from "react";
import { AccessShell } from "@/components/access/AccessShell";

type NotifCategory = "all" | "release" | "royalty" | "system";

const MOCK_NOTIFS = [
  { id: "1", category: "release" as const, title: "Release status updated", message: "\"Afterglow\" has been published and is now live.", time: "2 hours ago", read: false },
  { id: "2", category: "royalty" as const, title: "Royalty statement imported", message: "A new statement has been imported for Q1 2024.", time: "1 day ago", read: true },
  { id: "3", category: "system" as const, title: "Welcome to SUMG ACCESS", message: "Your creator portal is active. Explore your releases, royalties, and analytics.", time: "3 days ago", read: true },
];

const CAT_LABELS: Record<NotifCategory | "release" | "royalty" | "system", string> = {
  all: "All",
  release: "Releases",
  royalty: "Royalties",
  system: "System",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotifCategory>("all");
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);

  const filtered = filter === "all" ? notifs : notifs.filter((n) => n.category === filter);
  const unread = notifs.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifs(notifs.map((n) => ({ ...n, read: true })));
  }

  return (
    <AccessShell
      title="Notifications"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Notifications" },
      ]}
    >
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Notifications</h2>
            {unread > 0 && (
              <p className="text-[10px] text-white/30 mt-0.5">
                {unread} unread
              </p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-[9px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors border border-white/10 px-3 py-1.5"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {(["all", "release", "royalty", "system"] as NotifCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors ${
                filter === cat
                  ? "border-white/20 text-white bg-white/[0.05]"
                  : "border-white/[0.06] text-white/30 hover:border-white/15"
              }`}
            >
              {CAT_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="border border-white/5 py-12 text-center">
            <p className="text-[12px] text-white/20">No notifications.</p>
          </div>
        ) : (
          <div className="border border-white/5 divide-y divide-white/[0.04]">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`px-5 py-4 ${!n.read ? "bg-white/[0.025]" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-1.5 flex-shrink-0" />
                    )}
                    <div className={!n.read ? "" : "ml-4"}>
                      <p className="text-[11px] text-white/70 font-medium">{n.title}</p>
                      <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{n.message}</p>
                      <span className={`inline-block mt-1.5 text-[8px] tracking-[0.1em] uppercase border px-1 py-0.5 ${
                        n.category === "release" ? "border-blue-800/40 text-blue-400/50"
                        : n.category === "royalty" ? "border-green-800/40 text-green-400/50"
                        : "border-white/10 text-white/25"
                      }`}>
                        {CAT_LABELS[n.category as NotifCategory]}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-white/20 flex-shrink-0">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccessShell>
  );
}
