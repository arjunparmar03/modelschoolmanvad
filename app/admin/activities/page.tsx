'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Trash2, UploadCloud, Image as ImageIcon, Plus } from 'lucide-react'
import Image from 'next/image'
import { addActivity, deleteActivityImage } from '@/app/actions/adminActions'

export default function ActivitiesEditor() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingTitle, setUploadingTitle] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const loadActivities = () => {
    fetch('/api/cms').then(r => r.json()).then(data => {
      setActivities(data?.activities || [])
      setLoading(false)
    })
  }

  useEffect(() => { loadActivities() }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    await addActivity(title, desc, formData)
    setFile(null)
    setTitle('')
    setDesc('')
    setUploading(false)
    loadActivities()
  }

  const handleDirectUpload = async (activityTitle: string, selectedFile: File, existDesc: string) => {
    setUploadingTitle(activityTitle)
    const formData = new FormData()
    formData.append('file', selectedFile)
    await addActivity(activityTitle, existDesc, formData)
    setUploadingTitle(null)
    loadActivities()
  }

  const handleDeleteImage = async (actId: string, imgIndex: number) => {
    if (!confirm('Delete this photo? If it is the last photo, the entire activity will be removed.')) return
    await deleteActivityImage(actId, imgIndex)
    loadActivities()
  }

  return (
    <div className="p-6 md:p-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display">School Activities</h1>
        <p className="text-foreground/70 mt-1 max-w-2xl">Manage school activities and their photo collections.</p>
      </div>

      <div className="glass-card p-6 border border-border/50 mb-10 max-w-3xl">
        <h2 className="text-xl font-bold mb-4 font-display">Add Activity Photo</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">Activity Name</label>
                <input 
                  type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  placeholder="e.g. Science Fair 2026"
                />
                <p className="text-xs text-foreground/50 mt-1">Tip: Use an existing name to add more photos to it!</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">Description</label>
                <textarea 
                  value={desc} onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                  rows={2} placeholder="(Optional if appending to existing)"
                />
              </div>
            </div>
            <div className="flex-1 w-full space-y-4">
              <label className="block text-sm font-medium mb-1.5 text-foreground/80">Upload Photo</label>
              <div className="relative w-full h-32">
                <input 
                  type="file" required accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="absolute inset-0 rounded-xl border-2 border-dashed border-border bg-background flex flex-col items-center justify-center gap-2 text-sm text-foreground/60 overflow-hidden">
                  <UploadCloud size={24} /> {file ? file.name : 'Click or Drag Image Here'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={uploading || !file || !title} className="px-6 py-2.5 rounded-xl btn-shimmer bg-primary text-primary-foreground font-semibold shadow-lg">
              {uploading ? 'Uploading...' : 'Save Activity Photo'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6 max-w-5xl">
        {loading ? <p>Loading...</p> : activities.map((act) => (
          <div key={act.id} className="glass-card p-6 border border-border/50">
            <div className="mb-4">
              <h3 className="font-bold text-xl">{act.title}</h3>
              <p className="text-sm text-foreground/60 mt-1">{act.description}</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {act.images.map((img: any, idx: number) => (
                <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-black/5 border border-border/50">
                  <Image src={img.src} alt={img.alt} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm p-4 text-center">
                    <button onClick={() => handleDeleteImage(act.id, idx)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Inline Upload Plus Button */}
              <label className="group relative aspect-square rounded-xl overflow-hidden bg-black/2 hover:bg-black/5 border-2 border-dashed border-border/80 hover:border-primary/60 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-foreground/50 hover:text-primary">
                {uploadingTitle === act.title ? (
                  <span className="text-xs font-medium animate-pulse text-primary">Uploading...</span>
                ) : (
                  <>
                     <Plus size={24} className="group-hover:scale-110 transition-transform" />
                     <span className="text-xs font-medium">Add Photo</span>
                     <input 
                       type="file" 
                       accept="image/*" 
                       className="hidden" 
                       onChange={(e) => {
                          if (e.target.files?.[0]) handleDirectUpload(act.title, e.target.files[0], act.description)
                       }} 
                     />
                  </>
                )}
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
