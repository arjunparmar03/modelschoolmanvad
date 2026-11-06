'use client'

// Removed next/link
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Image as ImageIcon, Calendar, Bell, FileText, LogOut } from 'lucide-react'

export default function AdminSidebar() {
  const pathname = usePathname()

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/notices', label: 'Notices', icon: Bell },
    { href: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
    { href: '/admin/activities', label: 'Activities', icon: Calendar },
    { href: '/admin/content', label: 'Content', icon: FileText },
  ]

  return (
    <aside className="w-64 border-r border-border glass fixed lg:sticky top-0 h-screen hidden lg:flex flex-col z-10">
      <div className="p-6">
        <h2 className="text-xl font-bold text-foreground font-display">Admin Panel</h2>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = link.exact ? pathname === link.href : pathname?.startsWith(link.href)
          
          return (
            <a 
              key={link.href}
              href={link.href} 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'hover:bg-white/5 text-foreground/80 hover:text-foreground'
              }`}
            >
              <Icon size={18} /> {link.label}
            </a>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <a href="/api/admin/logout" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 font-medium transition-colors">
          <LogOut size={18} /> Logout
        </a>
      </div>
    </aside>
  )
}
