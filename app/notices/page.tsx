'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Bell,
  FileText,
  Download,
  ExternalLink,
  Search,
  Calendar,
  X,
  AlertCircle,
  Layers,
} from 'lucide-react'
import { Notice, NoticeCategory, NOTICE_CATEGORIES, formatISTDate } from '@/lib/notices-types'

export const dynamic = 'force-dynamic'

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

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeImagePreview, setActiveImagePreview] = useState<{ src: string; title: string } | null>(null)

  useEffect(() => {
    fetchNotices()
  }, [])

  const fetchNotices = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/notices', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load school notices.')
      const data = await res.json()
      setNotices(data.notices || [])
    } catch (err: any) {
      console.error('[Notices Page Error]:', err)
      setError(err.message || 'Unable to load notices at this time.')
    } finally {
      setLoading(false)
    }
  }

  // Filter notices by selected category and search query
  const filteredNotices = notices.filter((notice) => {
    const matchesCategory =
      selectedCategory === 'All' || notice.notice_type === selectedCategory

    const query = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !query ||
      notice.title.toLowerCase().includes(query) ||
      notice.description.toLowerCase().includes(query) ||
      notice.attachments?.some((a) => a.file_name.toLowerCase().includes(query))

    return matchesCategory && matchesSearch
  })

  // Category counts
  const getCategoryCount = (cat: string) => {
    if (cat === 'All') return notices.length
    return notices.filter((n) => n.notice_type === cat).length
  }

  return (
    <main className="min-h-screen bg-transparent relative pt-24 sm:pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 backdrop-blur-md mb-4 shadow-sm">
          <Bell size={14} className="animate-pulse text-accent" /> Official Circulars & Updates
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-foreground mb-4">
          School Notices & Circulars
        </h1>
        <p className="text-foreground/70 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Stay informed with the latest official announcements, examination schedules, merit lists, and admissions information for Model School, Manvad.
        </p>

        {/* Decorative Divider */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 rounded-full" />
          <div className="h-1.5 w-8 rounded-full bg-accent" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 rounded-full" />
        </div>
      </div>

      {/* Controls: Search & Category Filter Pills */}
      <div className="space-y-5 mb-10">
        {/* Search Input */}
        <div className="relative max-w-md mx-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notices by keyword or document..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl glass border border-border/80 bg-background/80 text-foreground placeholder:text-foreground/40 focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all text-sm shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2 py-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 border ${
              selectedCategory === 'All'
                ? 'bg-primary text-primary-foreground shadow-md border-primary'
                : 'glass hover:bg-white/10 text-foreground/75 border-border/60'
            }`}
          >
            <span>All Notices</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[0.65rem] ${
                selectedCategory === 'All'
                  ? 'bg-white/20 text-white'
                  : 'bg-black/10 dark:bg-white/10 text-foreground/70'
              }`}
            >
              {getCategoryCount('All')}
            </span>
          </button>

          {NOTICE_CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat)
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md border-primary'
                    : 'glass hover:bg-white/10 text-foreground/75 border-border/60'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[0.65rem] ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-black/10 dark:bg-white/10 text-foreground/70'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Notices Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 border border-border/50 animate-pulse rounded-2xl">
              <div className="h-4 bg-foreground/10 rounded-full w-28 mb-4"></div>
              <div className="h-6 bg-foreground/15 rounded-lg w-3/4 mb-3"></div>
              <div className="h-4 bg-foreground/10 rounded-lg w-full mb-2"></div>
              <div className="h-4 bg-foreground/10 rounded-lg w-2/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-8 border border-red-500/20 text-center rounded-2xl max-w-lg mx-auto">
          <AlertCircle size={36} className="mx-auto text-red-500 mb-3" />
          <h3 className="font-bold text-lg mb-1">Failed to load notices</h3>
          <p className="text-sm text-foreground/60 mb-5">{error}</p>
          <button
            onClick={fetchNotices}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-border/50 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
            <Layers size={28} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">No Notices Found</h3>
          <p className="text-sm text-foreground/60 leading-relaxed mb-4">
            {searchQuery
              ? `No notices match your search query "${searchQuery}". Try a different keyword.`
              : `There are currently no active circulars published under "${selectedCategory}".`}
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                setSelectedCategory('All')
                setSearchQuery('')
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredNotices.map((notice) => (
            <article
              key={notice.id}
              className="glass-card p-6 sm:p-7 border border-border/60 hover:border-primary/40 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-black/5"
            >
              {/* Card Meta Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(
                      notice.notice_type
                    )}`}
                  >
                    {notice.notice_type}
                  </span>

                  {notice.is_new && (
                    <span className="relative flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
                      </span>
                      NEW
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                  <Calendar size={14} className="text-primary/70" />
                  <span>{formatISTDate(notice.publish_date)}</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground mb-3 leading-snug">
                {notice.title}
              </h2>

              {/* Description */}
              <p className="text-sm sm:text-base text-foreground/80 leading-relaxed mb-5 whitespace-pre-line">
                {notice.description}
              </p>

              {/* Attachments Section */}
              {notice.attachments && notice.attachments.length > 0 && (
                <div className="pt-4 border-t border-border/40">
                  <span className="text-xs font-semibold text-foreground/50 tracking-wider uppercase block mb-3">
                    Attached Documents & Media ({notice.attachments.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {notice.attachments.map((att) => {
                      const isPdf = att.file_type === 'pdf'
                      const downloadUrl = att.signed_url || att.file_url

                      if (isPdf) {
                        return (
                          <a
                            key={att.id}
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 p-3 rounded-xl glass border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 transition-all text-left"
                            title={`Download ${att.file_name}`}
                          >
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {att.file_name}
                              </p>
                              <p className="text-[0.65rem] text-foreground/50 mt-0.5">
                                PDF Document {att.file_size ? `• ${formatFileSize(att.file_size)}` : ''}
                              </p>
                            </div>
                            <Download size={16} className="text-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                          </a>
                        )
                      }

                      // Image attachment
                      return (
                        <div
                          key={att.id}
                          onClick={() =>
                            setActiveImagePreview({
                              src: downloadUrl,
                              title: att.file_name,
                            })
                          }
                          className="group flex items-center gap-3 p-2.5 rounded-xl glass border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer text-left"
                        >
                          <div className="w-10 h-10 rounded-lg relative overflow-hidden bg-black/5 shrink-0 border border-border/40">
                            {att.signed_url ? (
                              <Image
                                src={att.signed_url}
                                alt={att.file_name}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-foreground/40">
                                🖼️
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {att.file_name}
                            </p>
                            <p className="text-[0.65rem] text-foreground/50 mt-0.5">
                              Image Preview {att.file_size ? `• ${formatFileSize(att.file_size)}` : ''}
                            </p>
                          </div>
                          <ExternalLink size={15} className="text-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {activeImagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveImagePreview(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-sm font-medium truncate max-w-md">
                {activeImagePreview.title}
              </span>
              <button
                onClick={() => setActiveImagePreview(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Close Preview"
              >
                <X size={22} />
              </button>
            </div>
            <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden bg-black/50 border border-white/10 shadow-2xl">
              <Image
                src={activeImagePreview.src}
                alt={activeImagePreview.title}
                fill
                className="object-contain"
              />
            </div>
            <div className="pt-3">
              <a
                href={activeImagePreview.src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition-all"
              >
                <Download size={14} /> Open Full Resolution
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

