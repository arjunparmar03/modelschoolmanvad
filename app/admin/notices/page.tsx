'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Bell,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Calendar,
  Globe,
  Lock,
  UploadCloud,
  X,
  Search,
  ExternalLink,
} from 'lucide-react'
import {
  Notice,
  NoticeCategory,
  NOTICE_CATEGORIES,
  getTodayIST,
  formatISTDate,
} from '@/lib/notices-types'
import {
  createNotice,
  updateNotice,
  toggleNoticePublishStatus,
  deleteNotice,
  uploadNoticeAttachment,
  deleteNoticeAttachment,
  registerNoticeAttachmentRecord,
} from '@/app/actions/adminActions'
import { createClient as createBrowserClient } from '@/utils/supabase/client'
import { AdminOptimizationPreview } from '@/components/admin-optimization-preview'
import { compressImageClient } from '@/lib/client-image-compression'

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getCategoryColor(category: NoticeCategory | string) {
  switch (category) {
    case 'Admission Notices':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
    case 'Merit List':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
    case 'Examination Notices':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
    case 'Events':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
    case 'General Notices':
    default:
      return 'bg-primary/10 text-primary border-primary/25'
  }
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState<{
    title: string
    description: string
    notice_type: NoticeCategory
    publish_date: string
    expiry_date: string
    is_published: boolean
  }>({
    title: '',
    description: '',
    notice_type: 'General Notices',
    publish_date: getTodayIST(),
    expiry_date: '',
    is_published: true,
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Modal State
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [uploadingSingleFile, setUploadingSingleFile] = useState(false)
  const singleFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAdminNotices()
  }, [])

  const loadAdminNotices = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/notices', { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login'
          return
        }
        throw new Error('Failed to load notices.')
      }
      const data = await res.json()
      setNotices(data.notices || [])
    } catch (err: any) {
      console.error('[Admin Notices Load Error]:', err)
      alert('Error loading notices: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Multi-file Selection for Creation with Client-Side Image Pre-Compression
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const incoming = Array.from(e.target.files)
    const valid: File[] = []

    for (let f of incoming) {
      const ext = f.name.split('.').pop()?.toLowerCase()
      if (ext === 'svg' || f.type.includes('svg')) {
        alert(`Security Warning: "${f.name}" is an SVG file, which is strictly prohibited.`)
        continue
      }
      if (f.size > 26214400) {
        alert(`File "${f.name}" exceeds maximum allowed limit of 25MB.`)
        continue
      }
      // Instantly optimize raster images in browser before upload
      if (f.type.startsWith('image/')) {
        try {
          f = await compressImageClient(f)
        } catch (compErr) {
          console.warn('[Client image compression failed, using original]:', compErr)
        }
      }
      valid.push(f)
    }

    setSelectedFiles((prev) => [...prev, ...valid])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Create Notice Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.title.trim() || !createForm.description.trim()) {
      alert('Please fill out all required fields.')
      return
    }

    try {
      setIsSubmitting(true)
      const metaFormData = new FormData()
      metaFormData.append('title', createForm.title.trim())
      metaFormData.append('description', createForm.description.trim())
      metaFormData.append('notice_type', createForm.notice_type)
      metaFormData.append('publish_date', createForm.publish_date || getTodayIST())
      if (createForm.expiry_date) {
        metaFormData.append('expiry_date', createForm.expiry_date)
      }
      metaFormData.append('is_published', createForm.is_published ? 'true' : 'false')

      // 1. Create notice metadata first (fast, lightweight request that never hits serverless body limits)
      const res = await createNotice(metaFormData)
      if (!res.success || !res.noticeId) {
        throw new Error(res.error || 'Failed to create notice.')
      }

      const noticeId = res.noticeId

      // 2. Upload attachments individually with automatic direct-storage fallback for large files
      if (selectedFiles.length > 0) {
        const supabase = createBrowserClient()

        for (let file of selectedFiles) {
          let uploadedSuccessfully = false

          if (file.type.startsWith('image/')) {
            try {
              file = await compressImageClient(file)
            } catch (compErr) {
              console.warn('[Pre-upload image compression failed]:', compErr)
            }
          }

          // If file <= 4MB, attempt server-side optimization upload
          if (file.size <= 4 * 1024 * 1024) {
            try {
              const fileFormData = new FormData()
              fileFormData.append('file', file)
              const attachRes = await uploadNoticeAttachment(noticeId, fileFormData)
              if (attachRes.success) {
                uploadedSuccessfully = true
              }
            } catch (serverErr) {
              console.warn('[Server upload failed, falling back to direct Storage upload]:', serverErr)
            }
          }

          // If file > 4MB (or server action failed/timed out), upload directly to Supabase Storage
          if (!uploadedSuccessfully) {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
            const fileType = ext === 'pdf' ? 'pdf' : 'image'
            const fileId = crypto.randomUUID()
            const storagePath = `notices/${noticeId}/${fileId}.${ext}`

            const { error: uploadErr } = await supabase.storage
              .from('school-notices')
              .upload(storagePath, file, {
                contentType: file.type || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'),
                upsert: false,
              })

            if (uploadErr) {
              console.error('[Direct Storage Upload Error]:', uploadErr)
              throw new Error(`Failed to upload "${file.name}": ${uploadErr.message}`)
            }

            const recordRes = await registerNoticeAttachmentRecord({
              noticeId,
              filePath: storagePath,
              fileName: file.name,
              fileType,
              fileSize: file.size,
            })

            if (!recordRes.success) {
              throw new Error(`Failed to record attachment "${file.name}": ${recordRes.error}`)
            }
          }
        }
      }

      // Reset and close
      setCreateForm({
        title: '',
        description: '',
        notice_type: 'General Notices',
        publish_date: getTodayIST(),
        expiry_date: '',
        is_published: true,
      })
      setSelectedFiles([])
      setShowCreateModal(false)
      loadAdminNotices()
    } catch (err: any) {
      alert('Error creating notice: ' + (err.message || 'Server connection error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update Notice Metadata
  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNotice) return

    try {
      setIsUpdating(true)
      const res = await updateNotice(editingNotice.id, {
        title: editingNotice.title,
        description: editingNotice.description,
        notice_type: editingNotice.notice_type,
        publish_date: editingNotice.publish_date,
        expiry_date: editingNotice.expiry_date,
        is_published: editingNotice.is_published,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to update notice.')
      }

      setEditingNotice(null)
      loadAdminNotices()
    } catch (err: any) {
      alert('Update Error: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  // Toggle Status Inline
  const handleToggleStatus = async (notice: Notice) => {
    const nextStatus = !notice.is_published
    const res = await toggleNoticePublishStatus(notice.id, nextStatus)
    if (!res.success) {
      alert('Error toggling status: ' + res.error)
      return
    }
    loadAdminNotices()
  }

  // Delete Entire Notice
  const handleDeleteNotice = async (notice: Notice) => {
    if (
      !confirm(
        `Are you sure you want to delete "${notice.title}"?\n\nThis will permanently remove the notice and all (${notice.attachments?.length || 0}) attached documents/images from both the database and private Storage.`
      )
    ) {
      return
    }

    const res = await deleteNotice(notice.id)
    if (!res.success) {
      alert('Delete Error: ' + res.error)
      return
    }
    if (res.warning) {
      alert(res.warning)
    }
    loadAdminNotices()
  }

  // Delete Individual Attachment
  const handleDeleteAttachment = async (attachmentId: string, fileName: string) => {
    if (!confirm(`Delete attachment "${fileName}"? This cannot be undone.`)) return

    const res = await deleteNoticeAttachment(attachmentId)
    if (!res.success) {
      alert('Attachment Delete Error: ' + res.error)
      return
    }
    if (res.warning) {
      alert(res.warning)
    }

    // Refresh active editing notice state if modal is open
    if (editingNotice) {
      setEditingNotice({
        ...editingNotice,
        attachments: editingNotice.attachments.filter((a) => a.id !== attachmentId),
      })
    }
    loadAdminNotices()
  }

  // Upload Additional Attachment to Editing Notice
  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingNotice || !e.target.files?.[0]) return
    let file = e.target.files[0]

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'svg' || file.type.includes('svg')) {
      alert('Security Warning: SVG files are strictly prohibited.')
      return
    }
    if (file.size > 26214400) {
      alert('File exceeds 25MB limit.')
      return
    }

    try {
      setUploadingSingleFile(true)
      if (file.type.startsWith('image/')) {
        try {
          file = await compressImageClient(file)
        } catch (compErr) {
          console.warn('[Single file client image compression failed]:', compErr)
        }
      }

      let uploadedSuccessfully = false
      let newAttachmentData: any = null

      if (file.size <= 4 * 1024 * 1024) {
        try {
          const formData = new FormData()
          formData.append('file', file)
          const res = await uploadNoticeAttachment(editingNotice.id, formData)
          if (res.success && res.data) {
            uploadedSuccessfully = true
            newAttachmentData = res.data
          }
        } catch (serverErr) {
          console.warn('[Server action failed, using direct Storage upload]:', serverErr)
        }
      }

      if (!uploadedSuccessfully) {
        const supabase = createBrowserClient()
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
        const fileType = ext === 'pdf' ? 'pdf' : 'image'
        const fileId = crypto.randomUUID()
        const storagePath = `notices/${editingNotice.id}/${fileId}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('school-notices')
          .upload(storagePath, file, {
            contentType: file.type || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'),
            upsert: false,
          })

        if (uploadErr) {
          throw new Error(`Failed to upload "${file.name}": ${uploadErr.message}`)
        }

        const recordRes = await registerNoticeAttachmentRecord({
          noticeId: editingNotice.id,
          filePath: storagePath,
          fileName: file.name,
          fileType,
          fileSize: file.size,
        })

        if (!recordRes.success) {
          throw new Error(`Failed to record attachment "${file.name}": ${recordRes.error}`)
        }
        newAttachmentData = recordRes.data
      }

      if (singleFileInputRef.current) singleFileInputRef.current.value = ''
      loadAdminNotices()

      // Update current modal state
      if (newAttachmentData) {
        setEditingNotice({
          ...editingNotice,
          attachments: [...(editingNotice.attachments || []), newAttachmentData],
        })
      }
    } catch (err: any) {
      alert('Upload Error: ' + err.message)
    } finally {
      setUploadingSingleFile(false)
    }
  }

  // Filter Notices
  const filteredNotices = notices.filter((n) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && n.is_published) ||
      (statusFilter === 'draft' && !n.is_published)

    const matchesCategory =
      categoryFilter === 'All' || n.notice_type === categoryFilter

    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q)

    return matchesStatus && matchesCategory && matchesSearch
  })

  // Stat Counts
  const totalCount = notices.length
  const publishedCount = notices.filter((n) => n.is_published).length
  const draftCount = notices.filter((n) => !n.is_published).length

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold font-display">Notices & Circulars</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Private Storage
            </span>
          </div>
          <p className="text-foreground/70 text-sm max-w-2xl">
            Publish school circulars, merit lists, examination schedules, and manage multi-file PDF & image attachments.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-shimmer flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:-translate-y-0.5 transition-all text-sm shrink-0"
        >
          <Plus size={18} /> Create Notice
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 border border-border/50 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground/60 font-semibold uppercase tracking-wider">Total Notices</p>
            <h3 className="text-2xl font-bold font-display mt-1">{totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Bell size={20} />
          </div>
        </div>

        <div className="glass-card p-5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Published</p>
            <h3 className="text-2xl font-bold font-display mt-1 text-emerald-600 dark:text-emerald-400">{publishedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Globe size={20} />
          </div>
        </div>

        <div className="glass-card p-5 border border-amber-500/20 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Drafts</p>
            <h3 className="text-2xl font-bold font-display mt-1 text-amber-600 dark:text-amber-400">{draftCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Lock size={20} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 rounded-2xl border border-border/50 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'published'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'draft'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            Drafts ({draftCount})
          </button>
        </div>

        {/* Category & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {NOTICE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-60">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-foreground/40 focus:ring-2 focus:ring-primary/40 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 border border-border/50 animate-pulse rounded-2xl h-36" />
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-border/50">
          <Bell size={36} className="mx-auto text-foreground/30 mb-3" />
          <h3 className="font-bold text-lg mb-1">No notices found</h3>
          <p className="text-sm text-foreground/60 mb-5">
            {searchQuery || categoryFilter !== 'All' || statusFilter !== 'all'
              ? 'No notices match the selected filters.'
              : 'You have not created any notices yet.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
          >
            Create Notice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => (
            <div
              key={notice.id}
              className="glass-card p-5 sm:p-6 border border-border/50 rounded-2xl transition-all hover:border-primary/40"
            >
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      notice.is_published
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {notice.is_published ? <Globe size={13} /> : <Lock size={13} />}
                    {notice.is_published ? 'Published' : 'Draft'}
                  </span>

                  {/* Category Badge */}
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                      notice.notice_type
                    )}`}
                  >
                    {notice.notice_type}
                  </span>

                  <span className="text-xs text-foreground/50 flex items-center gap-1">
                    <Calendar size={13} /> {formatISTDate(notice.publish_date)}
                    {notice.expiry_date && ` • Expires ${formatISTDate(notice.expiry_date)}`}
                  </span>
                </div>

                {/* Inline Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(notice)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      notice.is_published
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                    title={notice.is_published ? 'Unpublish notice' : 'Publish notice'}
                  >
                    {notice.is_published ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    onClick={() => setEditingNotice(notice)}
                    className="p-2 rounded-lg border border-border/80 hover:border-primary text-foreground/70 hover:text-primary transition-colors text-xs flex items-center gap-1"
                    title="Edit Notice"
                  >
                    <Edit3 size={15} />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteNotice(notice)}
                    className="p-2 rounded-lg border border-transparent hover:border-red-500/30 text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete Notice"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="font-bold text-lg font-display text-foreground mb-1.5">
                {notice.title}
              </h3>
              <p className="text-sm text-foreground/75 leading-relaxed line-clamp-2 mb-4">
                {notice.description}
              </p>

              {/* Attachments Section */}
              {notice.attachments && notice.attachments.length > 0 && (
                <div className="pt-3 border-t border-border/40">
                  <div className="flex flex-wrap gap-2.5 items-center">
                    <span className="text-xs font-medium text-foreground/50">
                      Attachments ({notice.attachments.length}):
                    </span>
                    {notice.attachments.map((att) => {
                      const isPdf = att.file_type === 'pdf'
                      const previewUrl = att.signed_url || att.file_url

                      return (
                        <div
                          key={att.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-black/5 dark:bg-white/5 border border-border/50 text-foreground/80 hover:border-primary/40 transition-all"
                        >
                          {isPdf ? (
                            <FileText size={14} className="text-red-500 shrink-0" />
                          ) : (
                            <span className="text-xs">🖼️</span>
                          )}
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-[140px] truncate hover:text-primary hover:underline"
                            title={att.file_name}
                          >
                            {att.file_name}
                          </a>
                          {att.file_size ? (
                            <span className="text-[0.65rem] text-foreground/40">
                              ({formatFileSize(att.file_size)})
                            </span>
                          ) : null}
                          <button
                            onClick={() => handleDeleteAttachment(att.id, att.file_name)}
                            className="text-foreground/30 hover:text-red-500 ml-1"
                            title="Delete attachment"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Create Notice Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="glass-card w-full max-w-2xl border border-border/80 rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-5">
              <div>
                <h2 className="text-xl font-bold font-display">Create School Notice</h2>
                <p className="text-xs text-foreground/60 mt-0.5">
                  Upload official circulars, examination details, or merit lists.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground/80">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Science Stream Merit List 2026-27"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">
                    Category *
                  </label>
                  <select
                    value={createForm.notice_type}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, notice_type: e.target.value as NoticeCategory })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    {NOTICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">
                    Publish Date (IST) *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.publish_date}
                    onChange={(e) => setCreateForm({ ...createForm, publish_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={createForm.expiry_date}
                    onChange={(e) => setCreateForm({ ...createForm, expiry_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                  <p className="text-[0.65rem] text-foreground/50 mt-1">
                    Notice will be automatically archived after this date.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">
                    Initial Status
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <input
                        type="radio"
                        checked={createForm.is_published}
                        onChange={() => setCreateForm({ ...createForm, is_published: true })}
                        className="text-primary focus:ring-primary/40"
                      />
                      <span>Published (Live)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <input
                        type="radio"
                        checked={!createForm.is_published}
                        onChange={() => setCreateForm({ ...createForm, is_published: false })}
                        className="text-primary focus:ring-primary/40"
                      />
                      <span>Draft (Hidden)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground/80">
                  Description / Details *
                </label>
                <textarea
                  required
                  rows={4}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Enter full details, instructions, or notes for students and parents..."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                />
              </div>

              {/* Multi-File Upload Zone */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground/80">
                  Attachments (PDFs or Images, max 25MB each)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-5 text-center cursor-pointer bg-black/2 dark:bg-white/2 hover:bg-black/5 transition-all"
                >
                  <UploadCloud size={24} className="mx-auto text-foreground/40 mb-1.5" />
                  <p className="text-xs font-medium text-foreground/80">
                    Click to select multiple PDFs or photos
                  </p>
                  <p className="text-[0.65rem] text-foreground/50 mt-0.5">
                    Supports .pdf, .jpg, .png, .webp (SVGs strictly prohibited)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Selected Files Preview List with Adaptive Optimization Metrics */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground/70">
                        Selected Attachments ({selectedFiles.length}):
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-[0.65rem] text-red-500 hover:underline"
                      >
                        Remove All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedFiles.map((f, i) => (
                        <AdminOptimizationPreview
                          key={`${f.name}-${i}-${f.size}`}
                          file={f}
                          onClear={() => removeSelectedFile(i)}
                          context="notices"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-black/5 text-foreground/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-shimmer px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Notice & Uploading...' : 'Save & Create Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Edit Notice Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editingNotice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="glass-card w-full max-w-2xl border border-border/80 rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-5">
              <div>
                <h2 className="text-xl font-bold font-display">Edit School Notice</h2>
                <p className="text-xs text-foreground/60 mt-0.5">
                  Update circular details or manage attachments.
                </p>
              </div>
              <button
                onClick={() => setEditingNotice(null)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground/80">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingNotice.title}
                  onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">
                    Category *
                  </label>
                  <select
                    value={editingNotice.notice_type}
                    onChange={(e) =>
                      setEditingNotice({
                        ...editingNotice,
                        notice_type: e.target.value as NoticeCategory,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    {NOTICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">
                    Publish Date (IST) *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingNotice.publish_date}
                    onChange={(e) =>
                      setEditingNotice({ ...editingNotice, publish_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editingNotice.expiry_date || ''}
                    onChange={(e) =>
                      setEditingNotice({ ...editingNotice, expiry_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground/80">
                    Publication Status
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <input
                        type="radio"
                        checked={editingNotice.is_published}
                        onChange={() =>
                          setEditingNotice({ ...editingNotice, is_published: true })
                        }
                        className="text-primary focus:ring-primary/40"
                      />
                      <span>Published (Live)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <input
                        type="radio"
                        checked={!editingNotice.is_published}
                        onChange={() =>
                          setEditingNotice({ ...editingNotice, is_published: false })
                        }
                        className="text-primary focus:ring-primary/40"
                      />
                      <span>Draft (Hidden)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground/80">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={editingNotice.description}
                  onChange={(e) =>
                    setEditingNotice({ ...editingNotice, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                />
              </div>

              {/* Current Attachments List with Delete */}
              <div className="pt-2 border-t border-border/40">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-foreground/80">
                    Current Attachments ({editingNotice.attachments?.length || 0})
                  </span>
                  <label className="cursor-pointer text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    <Plus size={14} />
                    <span>{uploadingSingleFile ? 'Uploading...' : 'Add Attachment'}</span>
                    <input
                      ref={singleFileInputRef}
                      type="file"
                      disabled={uploadingSingleFile}
                      accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleSingleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {editingNotice.attachments && editingNotice.attachments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {editingNotice.attachments.map((att) => {
                      const isPdf = att.file_type === 'pdf'
                      const previewUrl = att.signed_url || att.file_url

                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {isPdf ? (
                              <FileText size={16} className="text-red-500 shrink-0" />
                            ) : (
                              <span className="text-sm">🖼️</span>
                            )}
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-foreground hover:text-primary hover:underline truncate max-w-xs"
                              title="Click to preview (signed URL)"
                            >
                              {att.file_name}
                            </a>
                            {att.file_size && (
                              <span className="text-foreground/40 text-[0.65rem]">
                                {formatFileSize(att.file_size)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground/40 hover:text-primary p-1"
                              title="Preview"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att.id, att.file_name)}
                              className="text-foreground/40 hover:text-red-500 p-1"
                              title="Delete Attachment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-foreground/50 py-3 text-center border border-dashed border-border/60 rounded-xl">
                    No attachments attached to this notice.
                  </p>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setEditingNotice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-black/5 text-foreground/70"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-shimmer px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:opacity-90 disabled:opacity-50"
                >
                  {isUpdating ? 'Saving Changes...' : 'Update Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

