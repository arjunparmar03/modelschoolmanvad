import AdminSidebar from '@/components/admin-sidebar'

export const metadata = {
  title: 'Admin Dashboard | Model School Manvad',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden relative">
        {children}
      </main>
    </div>
  )
}
