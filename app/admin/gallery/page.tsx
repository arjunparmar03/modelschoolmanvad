'use client'

import { useState, useEffect } from 'react'
import { UploadCloud, Image as ImageIcon, Trash2, Plus } from 'lucide-react'
import Image from 'next/image'
import { addGalleryItem, deleteGalleryImage } from '@/app/actions/adminActions'

export default function GalleryEditor() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingTitle, setUploadingTitle] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const loadGallery = () => {
    fetch('/api/cms').then(r => r.json()).then(data => {
      setCategories(data?.galleryCategories || [])
      setLoading(false)
    })
  }

  useEffect(() => { loadGallery() }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    await addGalleryItem(title, formData)
    setFile(null)
    setTitle('')
    setUploading(false)
    loadGallery()
  }

  const handleDirectUpload = async (categoryTitle: string, selectedFile: File) => {
    setUploadingTitle(categoryTitle)
    const formData = new FormData()
    formData.append('file', selectedFile)
    await addGalleryItem(categoryTitle, formData)
    setUploadingTitle(null)
    loadGallery()
  }

  const handleDelete = async (catId: string, imgIndex: number) => {
    if (!confirm('Delete this photo? If it is the last photo, the category will be removed.')) return
    await deleteGalleryImage(catId, imgIndex)
    loadGallery()
  }

  return (
    <div className="p-6 md:p-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display">Gallery Management</h1>
        <p className="text-foreground/70 mt-1 max-w-2xl">Upload photos to specific categories (e.g., Chemistry Lab).</p>
      </div>

      <div className="glass-card p-6 border border-border/50 mb-10 max-w-3xl">
        <h2 className="text-xl font-bold mb-4 font-display">Add New Photo</h2>
        <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="block text-sm font-medium mb-1.5 text-foreground/80">Category Name</label>
            <input 
              type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none"
              placeholder="e.g. Chemistry Lab"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {categories.map(c => <option key={c.id} value={c.title} />)}
            </datalist>
            <p className="text-xs text-foreground/50 mt-1 absolute -bottom-5 left-0 w-max">Use an existing name to group photos together.</p>
          </div>
          <div className="flex-1 w-full relative">
            <input 
              type="file" required accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center gap-2 text-sm text-foreground/60 overflow-hidden">
              <UploadCloud size={18} /> {file ? file.name : 'Choose Image'}
            </div>
          </div>
          <button type="submit" disabled={uploading || !file || !title} className="px-6 py-2.5 rounded-xl btn-shimmer bg-primary text-primary-foreground font-semibold shadow-lg shrink-0 h-[46px] mb-[1px]">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>

      <div className="space-y-6 max-w-5xl text-left">
        {loading ? <p>Loading...</p> : categories.map((cat) => (
          <div key={cat.id} className="glass-card p-5 border border-border/50">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <ImageIcon size={18} className="text-primary" /> {cat.title} ({cat.images.length})
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {cat.images.map((img: any, idx: number) => (
                <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-black/5 border border-border/50">
                  <Image src={img.src} alt={img.alt} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm p-4 text-center">
                    <button onClick={() => handleDelete(cat.id, idx)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Inline Upload Plus Button */}
              <label className="group relative aspect-square rounded-xl overflow-hidden bg-black/2 hover:bg-black/5 border-2 border-dashed border-border/80 hover:border-primary/60 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-foreground/50 hover:text-primary">
                {uploadingTitle === cat.title ? (
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
                          if (e.target.files?.[0]) handleDirectUpload(cat.title, e.target.files[0])
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
