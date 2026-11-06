'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles, FileText, X, CheckCircle2, Info, ArrowRight } from 'lucide-react'

export interface OptimizationMetrics {
  originalName: string
  originalSize: number
  optimizedSize: number
  savingsPercent: number
  originalDimensions?: { width: number; height: number }
  optimizedDimensions?: { width: number; height: number }
  format: string
  extension?: string
  isOptimized: boolean
  message: string
  isPdf?: boolean
  pageCount?: number
  mode?: 'balanced' | 'highQuality' | 'maximum'
  warnings?: string[]
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

interface AdminOptimizationPreviewProps {
  file: File | null
  onClear: () => void
  context?: 'gallery' | 'activities' | 'notices'
}

export function AdminOptimizationPreview({
  file,
  onClear,
  context = 'gallery',
}: AdminOptimizationPreviewProps) {
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setMetrics(null)
      setError(null)
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
      setLocalPreviewUrl(null)
      return
    }

    // Generate instant client-side object URL (0 network transfer)
    const isImage = file.type.startsWith('image/')
    if (isImage) {
      const url = URL.createObjectURL(file)
      setLocalPreviewUrl(url)
    } else {
      setLocalPreviewUrl(null)
    }

    // Analyze file through server action route to obtain exact compression metrics
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('context', context)

        const res = await fetch('/api/admin/optimize-preview', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to analyze file')
        }

        const data: OptimizationMetrics = await res.json()
        setMetrics(data)
      } catch (err: any) {
        setError(err.message || 'Analysis error')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()

    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [file, context])

  if (!file) return null

  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')

  return (
    <div className="glass-card p-4 rounded-xl border border-primary/25 bg-primary/5 mt-3 animate-fade-in relative">
      <button
        type="button"
        onClick={onClear}
        className="absolute top-2.5 right-2.5 p-1 rounded-lg text-foreground/40 hover:text-foreground hover:bg-black/5"
        title="Remove file"
      >
        <X size={16} />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Visual Preview */}
        <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-border/60 bg-black/5 flex items-center justify-center">
          {localPreviewUrl ? (
            <Image
              src={localPreviewUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          ) : isPdf ? (
            <FileText size={28} className="text-red-500" />
          ) : (
            <Sparkles size={24} className="text-primary" />
          )}
        </div>

        {/* Content & Metrics */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
              {file.name}
            </span>

            {loading ? (
              <span className="text-[0.65rem] font-semibold text-primary animate-pulse">
                {isPdf ? 'Analyzing PDF streams & structure...' : 'Analyzing compression...'}
              </span>
            ) : metrics ? (
              <>
                {metrics.savingsPercent > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ⚡ {metrics.savingsPercent}% Storage Saved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    <CheckCircle2 size={11} /> Authenticity Preserved
                  </span>
                )}

                {metrics.isPdf && metrics.pageCount ? (
                  <span className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-border/50 text-foreground/70">
                    📄 {metrics.pageCount} {metrics.pageCount === 1 ? 'Page' : 'Pages'}
                  </span>
                ) : null}

                {metrics.isPdf && metrics.mode ? (
                  <span className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                    {metrics.mode} Mode
                  </span>
                ) : null}
              </>
            ) : null}
          </div>

          {loading ? (
            <p className="text-[0.7rem] text-foreground/50">
              {isPdf
                ? 'Compressing object streams, deflating content, and checking embedded resources...'
                : 'Measuring image dimensions and calculating optimal WebP settings...'}
            </p>
          ) : error ? (
            <p className="text-[0.7rem] text-red-500">{error}</p>
          ) : metrics ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-foreground/70">
                <span>
                  Original: <strong>{formatBytes(metrics.originalSize)}</strong>
                  {metrics.originalDimensions && ` (${metrics.originalDimensions.width}×${metrics.originalDimensions.height})`}
                </span>

                {metrics.isOptimized && (
                  <>
                    <ArrowRight size={11} className="text-foreground/40 hidden sm:inline" />
                    <span>
                      Target: <strong className="text-primary">{formatBytes(metrics.optimizedSize)}</strong>
                      {metrics.optimizedDimensions && ` (${metrics.optimizedDimensions.width}×${metrics.optimizedDimensions.height})`}
                    </span>
                    <span className="uppercase font-semibold text-[0.65rem] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                      {metrics.format}
                    </span>
                  </>
                )}
              </div>

              <p className="text-[0.65rem] text-foreground/50 flex items-center gap-1">
                <Info size={11} className="shrink-0" /> {metrics.message}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AdminOptimizationPreview
