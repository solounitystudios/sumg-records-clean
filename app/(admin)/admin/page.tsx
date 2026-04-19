import { AdminShell } from "@/components/admin/AdminShell";
import { artists } from "@/data/artists";
import { producers } from "@/data/producers";
import { brands } from "@/data/brands";
import { getPublishedReleases } from "@/lib/cms";

export const metadata = { title: "Dashboard — SUMG Admin" };

export default function AdminDashboard() {
  const publishedReleases = getPublishedReleases();
  const stats = [
    { label: "Artists", value: artists.length, href: "/admin/artists" },
    { label: "Producers", value: producers.length, href: "/admin/producers" },
    { label: "Brands", value: brands.length, href: "/admin/brands" },
    { label: "Published Releases", value: publishedReleases.length, href: "/admin/releases" },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="space-y-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">Overview</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <a key={stat.label} href={stat.href} className="border border-white/5 p-5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-200 block">
                <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">{stat.label}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">Quick Actions</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Manage Artists", href: "/admin/artists" },
              { label: "Manage Releases", href: "/admin/releases" },
              { label: "Upload Media", href: "/admin/media" },
              { label: "Manage Brands", href: "/admin/brands" },
              { label: "Manage Producers", href: "/admin/producers" },
              { label: "View Public Site", href: "/" },
            ].map((action) => (
              <a key={action.label} href={action.href}
                className="border border-white/5 px-5 py-4 text-[11px] tracking-[0.15em] uppercase text-white/40 hover:text-white hover:border-white/15 hover:bg-white/[0.02] transition-all duration-200 block">
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
