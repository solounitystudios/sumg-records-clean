import type { Metadata } from "next";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin Dashboard | SUMG Records",
  description: "SUMG Records Admin CMS",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-dark-900 flex">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
