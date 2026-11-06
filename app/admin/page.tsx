import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-bold font-display mb-2">Dashboard Overview</h1>
      <p className="text-foreground/70 mb-8">Welcome back. Select a module from the sidebar to manage your website securely.</p>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border border-border/50 transition-all hover:-translate-y-1">
          <h3 className="font-bold text-lg mb-2">Notices & Circulars</h3>
          <p className="text-sm text-foreground/60 mb-4">Post official circulars, examination lists, and multi-file PDF attachments.</p>
          <Link href="/admin/notices" className="text-primary font-medium text-sm hover:underline">Manage Notices &rarr;</Link>
        </div>
        <div className="glass-card p-6 border border-border/50 transition-all hover:-translate-y-1">
          <h3 className="font-bold text-lg mb-2">Gallery Management</h3>
          <p className="text-sm text-foreground/60 mb-4">Upload new photos, delete old ones, or reorder the gallery section.</p>
          <Link href="/admin/gallery" className="text-primary font-medium text-sm hover:underline">Manage Gallery &rarr;</Link>
        </div>
        <div className="glass-card p-6 border border-border/50 transition-all hover:-translate-y-1">
          <h3 className="font-bold text-lg mb-2">Activities Management</h3>
          <p className="text-sm text-foreground/60 mb-4">Post upcoming school activities, update galleries, and showcase student life.</p>
          <Link href="/admin/activities" className="text-primary font-medium text-sm hover:underline">Manage Activities &rarr;</Link>
        </div>
        <div className="glass-card p-6 border border-border/50 transition-all hover:-translate-y-1">
          <h3 className="font-bold text-lg mb-2">Content Editor</h3>
          <p className="text-sm text-foreground/60 mb-4">Update announcements and hero text on the homepage seamlessly.</p>
          <Link href="/admin/content" className="text-primary font-medium text-sm hover:underline">Edit Content &rarr;</Link>
        </div>
      </div>
    </div>
  )
}
