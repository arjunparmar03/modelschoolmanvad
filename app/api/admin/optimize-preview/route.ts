import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { optimizeImage } from '@/lib/image-optimizer'
import { optimizePdf, isPdfBuffer, PdfCompressionMode } from '@/lib/pdf-optimizer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Verify admin authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const context = (formData.get('context') as 'gallery' | 'activities' | 'notices') || 'gallery'
    const pdfMode = (formData.get('pdfMode') as PdfCompressionMode) || 'balanced'

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No valid file provided.' }, { status: 400 })
    }

    const fileName = file.name || 'uploaded-file'
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    // SVG security check
    if (ext === 'svg' || file.type.includes('svg')) {
      return NextResponse.json(
        { error: 'SVG files are strictly disallowed for security reasons.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Handle PDF by content verification (magic bytes) or extension/mime
    if (isPdfBuffer(buffer) || file.type === 'application/pdf' || ext === 'pdf') {
      try {
        const pdfResult = await optimizePdf(buffer, { mode: pdfMode })
        return NextResponse.json({
          originalName: fileName,
          originalSize: pdfResult.originalSize,
          optimizedSize: pdfResult.optimizedSize,
          savingsPercent: pdfResult.savingsPercent,
          pageCount: pdfResult.pageCount,
          format: 'pdf',
          isPdf: true,
          isOptimized: pdfResult.isOptimized,
          mode: pdfResult.mode,
          message: pdfResult.message,
          warnings: pdfResult.warnings,
          hasImages: pdfResult.hasImages,
          imagesOptimizedCount: pdfResult.imagesOptimizedCount,
        })
      } catch (pdfErr: any) {
        return NextResponse.json({ error: pdfErr.message }, { status: 400 })
      }
    }

    // Handle Image
    const result = await optimizeImage(buffer, { moduleContext: context })

    return NextResponse.json({
      originalName: fileName,
      originalSize: result.originalSize,
      optimizedSize: result.optimizedSize,
      savingsPercent: result.savingsPercent,
      originalDimensions: result.originalDimensions,
      optimizedDimensions: result.optimizedDimensions,
      format: result.format,
      extension: result.extension,
      isOptimized: result.isOptimized,
      message: result.message,
      isPdf: false,
    })
  } catch (err: any) {
    console.error('[optimize-preview API Error]:', err)
    return NextResponse.json({ error: err.message || 'Failed to analyze file.' }, { status: 500 })
  }
}

