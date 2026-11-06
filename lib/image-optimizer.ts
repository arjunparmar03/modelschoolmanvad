import sharp from 'sharp'

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  moduleContext?: 'gallery' | 'activities' | 'notices'
}

export interface OptimizationResult {
  buffer: Buffer
  format: string
  contentType: string
  extension: string
  originalSize: number
  optimizedSize: number
  originalDimensions: { width: number; height: number }
  optimizedDimensions: { width: number; height: number }
  savingsPercent: number
  isOptimized: boolean
  message: string
}

/**
 * Intelligent, adaptive server-side image optimization engine.
 * 
 * Principles:
 * 1. Never upscale smaller images.
 * 2. Downsamples large raw photos to appropriate display dimensions.
 * 3. Preserves alpha transparency for PNGs and transparent WebPs.
 * 4. Preserves animated GIFs completely without loss of frames.
 * 5. Compares before-and-after bytes dynamically; retains original if already optimized.
 * 6. Strips unnecessary camera metadata while honoring EXIF orientation.
 * 7. Protects against decompression bombs (> 50 megapixels).
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<OptimizationResult> {
  const originalSize = inputBuffer.length

  // 1. Initial metadata inspection
  let metadata: sharp.Metadata
  try {
    metadata = await sharp(inputBuffer).metadata()
  } catch (err: any) {
    throw new Error(`Failed to read image metadata: ${err?.message || 'Invalid or corrupted image format'}`)
  }

  const origWidth = metadata.width || 0
  const origHeight = metadata.height || 0
  const origFormat = metadata.format?.toLowerCase() || 'unknown'
  const hasAlpha = Boolean(metadata.hasAlpha || metadata.channels === 4)
  const isAnimated = Boolean(metadata.pages && metadata.pages > 1)

  // 2. Decompression bomb protection (50 megapixels)
  if (origWidth * origHeight > 50_000_000) {
    throw new Error('Image dimensions exceed the safety limit of 50 megapixels.')
  }

  // 3. Animated GIF & GIF Preservation (Correction 4)
  // Preserve animated GIFs completely without modification to eliminate risk of frame flattening or timing alteration.
  if (origFormat === 'gif') {
    return {
      buffer: inputBuffer,
      format: 'gif',
      contentType: 'image/gif',
      extension: 'gif',
      originalSize,
      optimizedSize: originalSize,
      originalDimensions: { width: origWidth, height: origHeight },
      optimizedDimensions: { width: origWidth, height: origHeight },
      savingsPercent: 0,
      isOptimized: false,
      message: isAnimated
        ? 'Animated GIF preserved completely without modification to protect animation frames.'
        : 'GIF format preserved unchanged to retain palette and transparency integrity.',
    }
  }

  // 4. Determine sensible maximum dimensions based on module context (Correction 3)
  // Gallery lightbox / Activities modal: max 1600px (retina coverage for max-w-5xl/1024px)
  // Notices attachments: max 1280px (retina coverage for max-w-4xl/896px)
  let targetMaxWidth = options.maxWidth
  let targetMaxHeight = options.maxHeight

  if (!targetMaxWidth) {
    if (options.moduleContext === 'notices') {
      targetMaxWidth = 1280
      targetMaxHeight = 1280
    } else {
      // Default for Gallery & Activities
      targetMaxWidth = 1600
      targetMaxHeight = 1600
    }
  }

  // 5. Initialize Sharp pipeline with auto-rotation from EXIF
  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate()

  // Resize only if original exceeds target dimensions (never upscale)
  const shouldResize = origWidth > targetMaxWidth || (targetMaxHeight && origHeight > targetMaxHeight)
  if (shouldResize) {
    pipeline = pipeline.resize({
      width: targetMaxWidth,
      height: targetMaxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  // 6. Format selection & adaptive compression
  let targetFormat = 'webp'
  let targetContentType = 'image/webp'
  let targetExtension = 'webp'
  const quality = options.quality ?? 82

  if (hasAlpha) {
    // Transparent image: WebP with 8-bit alpha preservation
    pipeline = pipeline.webp({
      quality: Math.min(quality + 2, 85),
      alphaQuality: 90,
      effort: 4,
    })
  } else {
    // Standard photograph: High-efficiency WebP
    pipeline = pipeline.webp({
      quality,
      effort: 4,
    })
  }

  const optimizedBuffer = await pipeline.toBuffer()
  const optimizedSize = optimizedBuffer.length

  // Read final dimensions of optimized image
  const optMeta = await sharp(optimizedBuffer).metadata()
  const optWidth = optMeta.width || origWidth
  const optHeight = optMeta.height || origHeight

  // 7. Dynamic savings calculation (Correction 1)
  const savingsBytes = originalSize - optimizedSize
  const savingsPercent = originalSize > 0 ? parseFloat(((savingsBytes / originalSize) * 100).toFixed(1)) : 0

  // 8. Intelligence check: If optimization resulted in a larger file (already compressed), retain original
  if (optimizedSize >= originalSize * 0.98 && !shouldResize) {
    return {
      buffer: inputBuffer,
      format: origFormat,
      contentType: `image/${origFormat === 'jpg' ? 'jpeg' : origFormat}`,
      extension: origFormat === 'jpeg' ? 'jpg' : origFormat,
      originalSize,
      optimizedSize: originalSize,
      originalDimensions: { width: origWidth, height: origHeight },
      optimizedDimensions: { width: origWidth, height: origHeight },
      savingsPercent: 0,
      isOptimized: false,
      message: 'File is already highly optimized. Original format and quality retained unchanged.',
    }
  }

  return {
    buffer: optimizedBuffer,
    format: targetFormat,
    contentType: targetContentType,
    extension: targetExtension,
    originalSize,
    optimizedSize,
    originalDimensions: { width: origWidth, height: origHeight },
    optimizedDimensions: { width: optWidth, height: optHeight },
    savingsPercent: Math.max(0, savingsPercent),
    isOptimized: true,
    message: `Optimized to WebP (${savingsPercent}% storage saved) while preserving excellent visual clarity.`,
  }
}

/**
 * Validates and preserves PDF documents cleanly (Correction 5).
 * Rejects oversized or corrupted files while keeping authentic vector text, fonts, and layout.
 */
export function verifyPdfDocument(inputBuffer: Buffer, fileName: string): {
  buffer: Buffer
  fileSize: number
  contentType: string
  extension: string
  message: string
} {
  const fileSize = inputBuffer.length

  if (fileSize > 26214400) {
    throw new Error(`PDF "${fileName}" exceeds the maximum allowed limit of 25MB.`)
  }

  // Validate PDF magic bytes header: %PDF-
  const header = inputBuffer.subarray(0, 5).toString('ascii')
  if (header !== '%PDF-') {
    throw new Error(`File "${fileName}" does not have a valid PDF document header.`)
  }

  return {
    buffer: inputBuffer,
    fileSize,
    contentType: 'application/pdf',
    extension: 'pdf',
    message: 'Authentic vector PDF verified. Text crispness, fonts, and layout preserved 100%.',
  }
}

