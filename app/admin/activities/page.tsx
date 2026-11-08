'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Trash2, UploadCloud, Image as ImageIcon, Plus } from 'lucide-react'
import Image from 'next/image'
import { addActivity, deleteActivityImage, deleteActivity, revalidateActivities } from '@/app/actions/adminActions'
import { AdminOptimizationPreview } from '@/components/admin-optimization-preview'
import { compressImageClient } from '@/lib/client-image-compression'
import { createClient as createBrowserClient } from '@/utils/supabase/client'

export default function ActivitiesEditor() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingTitle, setUploadingTitle] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const loadActivities = async () => {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          title,
          description,
          activity_date,
          created_at,
          updated_at,
          activity_images (
            id,
            image_url,
            caption,
            sort_order,
            created_at
          )
        `)
        .order('activity_date', { ascending: false })

      if (!error && data) {
        const mapped = data.map((act: any) => {
          const rawImages = (act.activity_images || []) as any[]
          rawImages.sort((a, b) => {
            const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
            if (orderDiff !== 0) return orderDiff
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })

          const images = rawImages.map((img: any) => ({
            id: img.id,
            src: img.image_url,
            alt: img.caption || act.title,
          }))

          const thumbnail = images[0]?.src || '/placeholder.svg'

          return {
            id: act.id,
            title: act.title,
            description: act.description,
            thumbnail,
            images,
            activity_date: act.activity_date,
          }
        })

        if (mapped.length > 0) {
          setActivities(mapped)
          setLoading(false)
          return
        }
      }
    } catch (err) {
      console.warn('[loadActivities direct fetch fallback]:', err)
    }

    try {
      const res = await fetch(`/api/cms?_t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      setActivities(data?.activities || [])
    } catch (err) {
      console.error('[loadActivities fetch error]:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadActivities() }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return
    setUploading(true)
    try {
      let uploadFile = file
      if (uploadFile.type.startsWith('image/')) {
        uploadFile = await compressImageClient(uploadFile)
      }

      let uploadedSuccessfully = false

      // 1. Direct Supabase Storage upload
      try {
        const supabase = createBrowserClient()
        const ext = uploadFile.name.split('.').pop()?.toLowerCase() || 'webp'
        const filename = `${crypto.randomUUID()}.${ext}`
        const storagePath = `activities/${filename}`

        const { error: uploadError } = await supabase.storage
          .from('school-media')
          .upload(storagePath, uploadFile, {
            contentType: uploadFile.type || 'image/webp',
            upsert: false,
          })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('school-media')
            .getPublicUrl(storagePath)

          const cleanTitle = title.trim()
          const cleanDesc = desc?.trim() || cleanTitle

          const { data: existingAct } = await supabase
            .from('activities')
            .select('id')
            .ilike('title', cleanTitle)
            .maybeSingle()

          let activityId = existingAct?.id

          if (!activityId) {
            const { data: newAct } = await supabase
              .from('activities')
              .insert({
                title: cleanTitle,
                description: cleanDesc,
                image_url: publicUrl,
              })
              .select('id')
              .single()

            activityId = newAct?.id
          }

          if (activityId) {
            const { error: imgError } = await supabase
              .from('activity_images')
              .insert({
                activity_id: activityId,
                image_url: publicUrl,
                caption: cleanTitle,
              })

            if (!imgError) {
              uploadedSuccessfully = true
              await revalidateActivities()
            }
          }
        }
      } catch (directErr) {
        console.warn('[Direct activity upload fallback to Server Action]:', directErr)
      }

      // 2. Server Action fallback
      if (!uploadedSuccessfully) {
        const formData = new FormData()
        formData.append('file', uploadFile)
        const res = await addActivity(title, desc, formData)
        if (res?.error) {
          alert('Upload Error: ' + res.error)
          return
        }
      }
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Server connection error'))
    } finally {
      setFile(null)
      setTitle('')
      setDesc('')
      setUploading(false)
      loadActivities()
    }
  }

  const handleDirectUpload = async (activityTitle: string, selectedFile: File, existDesc: string) => {
    setUploadingTitle(activityTitle)
    try {
      let uploadFile = selectedFile
      if (uploadFile.type.startsWith('image/')) {
        uploadFile = await compressImageClient(uploadFile)
      }

      let uploadedSuccessfully = false

      // 1. Direct Supabase Storage upload
      try {
        const supabase = createBrowserClient()
        const ext = uploadFile.name.split('.').pop()?.toLowerCase() || 'webp'
        const filename = `${crypto.randomUUID()}.${ext}`
        const storagePath = `activities/${filename}`

        const { error: uploadError } = await supabase.storage
          .from('school-media')
          .upload(storagePath, uploadFile, {
            contentType: uploadFile.type || 'image/webp',
            upsert: false,
          })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('school-media')
            .getPublicUrl(storagePath)

          const cleanTitle = activityTitle.trim()
          const cleanDesc = existDesc?.trim() || cleanTitle

          const { data: existingAct } = await supabase
            .from('activities')
            .select('id')
            .ilike('title', cleanTitle)
            .maybeSingle()

          let activityId = existingAct?.id

          if (!activityId) {
            const { data: newAct } = await supabase
              .from('activities')
              .insert({
                title: cleanTitle,
                description: cleanDesc,
                image_url: publicUrl,
              })
              .select('id')
              .single()

            activityId = newAct?.id
          }

          if (activityId) {
            const { error: imgError } = await supabase
              .from('activity_images')
              .insert({
                activity_id: activityId,
                image_url: publicUrl,
                caption: cleanTitle,
              })

            if (!imgError) {
              uploadedSuccessfully = true
              await revalidateActivities()
            }
          }
        }
      } catch (directErr) {
        console.warn('[Direct activity upload fallback to Server Action]:', directErr)
      }

      // 2. Server Action fallback
      if (!uploadedSuccessfully) {
        const formData = new FormData()
        formData.append('file', uploadFile)
        const res = await addActivity(activityTitle, existDesc, formData)
        if (res?.error) {
          alert('Upload Error: ' + res.error)
          return
        }
      }
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Server connection error'))
    } finally {
      setUploadingTitle(null)
      loadActivities()
    }
  }

  const handleDeleteImage = async (imageIdOrActId: string, imgIndex?: number) => {
    if (!confirm('Delete this photo?')) return
    const res = await deleteActivityImage(imageIdOrActId, imgIndex)
    if (res?.error) alert("Delete Error: " + res.error)
    await revalidateActivities()
    loadActivities()
  }

  const handleDeleteActivity = async (actId: string, actTitle: string) => {
    if (!confirm(`Delete entire activity "${actTitle}" and all of its photos? This action cannot be undone.`)) return
    const res = await deleteActivity(actId)
    if (res?.error) alert("Delete Error: " + res.error)
    await revalidateActivities()
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
          {file && (
            <div className="pt-2 border-t border-border/40">
              <AdminOptimizationPreview file={file} onClear={() => setFile(null)} context="activities" />
            </div>
          )}
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
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-xl">{act.title}</h3>
                <p className="text-sm text-foreground/60 mt-1">{act.description}</p>
              </div>
              <button
                onClick={() => handleDeleteActivity(act.id, act.title)}
                className="p-2 text-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20 text-xs flex items-center gap-1.5 shrink-0"
                title="Delete Activity"
              >
                <Trash2 size={15} />
                <span className="hidden sm:inline">Delete Activity</span>
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {act.images.map((img: any, idx: number) => (
                <div key={img.id || idx} className="group relative aspect-square rounded-xl overflow-hidden bg-black/5 border border-border/50">
                  <Image src={img.src} alt={img.alt} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm p-4 text-center">
                    <button onClick={() => handleDeleteImage(img.id || act.id, idx)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30" title="Delete">
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
