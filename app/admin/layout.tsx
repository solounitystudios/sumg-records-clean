import { requireAdmin } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="min-h-screen bg-[#06070a] text-white flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 lg:ml-56 pt-12 lg:pt-0">
        {children}
      </div>
    </div>
  )
}
