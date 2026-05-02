import { requireAdmin } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminPlayerShell } from "./AdminPlayerShell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="min-h-screen bg-[#06070a] text-white flex">
      <AdminSidebar />
      <AdminPlayerShell>{children}</AdminPlayerShell>
    </div>
  )
}
