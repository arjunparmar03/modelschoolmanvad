'use client'

import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { updateContent } from '@/app/actions/adminActions'

export default function ContentEditor() {
  const [heroHeading, setHeroHeading] = useState('Model School, Manvad')
  const [heroSubtitle, setHeroSubtitle] = useState('Quality education for classes 6 to 12. Dedicated to academic excellence and student success.')
  const [email, setEmail] = useState('modelmanvad@gmail.com')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch('/api/cms').then(r => r.json()).then(data => {
      if (data?.content) {
        setHeroHeading(data.content.heroHeading)
        setHeroSubtitle(data.content.heroSubtitle)
        if (data.content.email) setEmail(data.content.email)
      }
    })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    await updateContent({ heroHeading, heroSubtitle, email })
    setIsSaving(false)
    alert("Live content updated successfully!")
  }

  return (
    <div className="p-6 md:p-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Content Editor</h1>
          <p className="text-foreground/70 mt-1 max-w-2xl">
            Modify the live text displayed on the main website.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-shimmer flex items-center shrink-0 gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6 max-w-3xl">
        <div className="glass-card p-6 border border-border/50">
          <h2 className="text-xl font-bold mb-5 font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent"></span> Hero Section
          </h2>
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground/80">Main Heading</label>
              <input 
                type="text" 
                value={heroHeading}
                onChange={(e) => setHeroHeading(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground/80">Subtitle / Description</label>
              <textarea 
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
