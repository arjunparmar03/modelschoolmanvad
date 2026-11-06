import { PDFDocument, PDFName, PDFNumber, PDFRawStream, EncryptedPDFError, PDFDict } from 'pdf-lib'
import zlib from 'zlib'
import jpeg from 'jpeg-js'

export type PdfCompressionMode = 'balanced' | 'highQuality' | 'maximum'

export interface PdfOptimizationOptions {
  mode?: PdfCompressionMode
  preserveMetadata?: boolean
  maxImageWidth?: number
  maxImageHeight?: number
}

export interface PdfOptimizationResult {
  buffer: Buffer
  originalSize: number
  optimizedSize: number
  savingsPercent: number
  pageCount: number
  isOptimized: boolean
  mode: PdfCompressionMode
  message: string
  warnings: string[]
  hasImages: boolean
  imagesOptimizedCount: number
}

/**
 * Validates whether a buffer has the standard PDF header magic bytes (%PDF-).
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-'
}

/**
 * Fast nearest-neighbor / box downsampling for raw RGBA pixel arrays.
 */
function downsampleRgba(
  data: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8Array {
  const out = new Uint8Array(dstW * dstH * 4)
  const xRatio = srcW / dstW
  const yRatio = srcH / dstH

  for (let y = 0; y < dstH; y++) {
    const srcY = Math.min(Math.floor(y * yRatio), srcH - 1)
    const dstRow = y * dstW * 4
    const srcRow = srcY * srcW * 4

    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(Math.floor(x * xRatio), srcW - 1)
      const srcIdx = srcRow + srcX * 4
      const dstIdx = dstRow + x * 4

      out[dstIdx] = data[srcIdx]
      out[dstIdx + 1] = data[srcIdx + 1]
      out[dstIdx + 2] = data[srcIdx + 2]
      out[dstIdx + 3] = data[srcIdx + 3]
    }
  }

  return out
}

/**
 * Safe, intelligent server-side PDF optimization engine.
 * 
 * Strict safety rules:
 * 1. Never rasterizes PDF pages into images; selectable text and vector fonts are preserved.
 * 2. Compresses structural objects into Flate-encoded Object Streams (useObjectStreams: true).
 * 3. Compresses uncompressed content/font streams using zlib level 9.
 * 4. Optimizes embedded JPEG images without corrupting layout, text, or coordinates.
 * 5. Removes bloated XML metadata when safe while preserving Info dictionary metadata.
 * 6. Always validates the resulting document before returning; if invalid or larger, preserves the original.
 * 7. Enforces the 25MB safety upload limit.
 */
export async function optimizePdf(
  inputBuffer: Buffer,
  options: PdfOptimizationOptions = {}
): Promise<PdfOptimizationResult> {
  const originalSize = inputBuffer.length
  const mode = options.mode || 'balanced'
  const warnings: string[] = []

  // 1. Enforce 25 MB safety limit
  if (originalSize > 26214400) {
    throw new Error('PDF exceeds the maximum allowed limit of 25MB.')
  }

  // 2. Validate header magic bytes
  if (!isPdfBuffer(inputBuffer)) {
    throw new Error('File is not a valid PDF document (missing %PDF- header).')
  }

  // 2B. Fast-path check for Digital Signatures (Requirement 3 & 4)
  // Modifying a digitally signed document breaks its cryptographic byte-range hash.
  // We must preserve signed documents byte-for-byte.
  const hasDigitalSignature =
    inputBuffer.includes(Buffer.from('/ByteRange')) ||
    inputBuffer.includes(Buffer.from('/Type /Sig')) ||
    inputBuffer.includes(Buffer.from('/Type/Sig'))

  if (hasDigitalSignature) {
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount: 1,
      isOptimized: false,
      mode,
      message:
        'Digitally signed PDF detected. Document preserved byte-for-byte to protect cryptographic signature integrity.',
      warnings: ['Document contains cryptographic digital signature; preserved original'],
      hasImages: false,
      imagesOptimizedCount: 0,
    }
  }

  // 3. Parse PDF document
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(inputBuffer)
  } catch (err: any) {
    if (
      err instanceof EncryptedPDFError ||
      err.name === 'EncryptedPDFError' ||
      err.message?.includes('encrypted')
    ) {
      return {
        buffer: inputBuffer,
        originalSize,
        optimizedSize: originalSize,
        savingsPercent: 0,
        pageCount: 1,
        isOptimized: false,
        mode,
        message:
          'Password-protected PDF detected. Document cannot be re-compressed without password. Original preserved without alteration.',
        warnings: ['Document is encrypted/password-protected; preserved original'],
        hasImages: false,
        imagesOptimizedCount: 0,
      }
    }
    try {
      doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true })
    } catch {
      throw new Error(`Failed to parse PDF document: ${err?.message || 'Corrupted or invalid structure'}`)
    }
  }

  // 4. Safe page count computation (handles unusual or malformed structures)
  let pageCount = 1
  try {
    pageCount = doc.getPageCount()
  } catch {
    // If pages cannot be computed cleanly, safely retain original document
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount: 1,
      isOptimized: false,
      mode,
      message:
        'Unusual or unsupported PDF page structure detected. Original document preserved byte-for-byte.',
      warnings: ['Cannot compute page tree cleanly; preserved original'],
      hasImages: false,
      imagesOptimizedCount: 0,
    }
  }

  // 4A. Handle Password-Protected / Encrypted PDFs (Requirement 8.8)
  if (doc.isEncrypted) {
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount,
      isOptimized: false,
      mode,
      message:
        'Password-protected PDF detected. Document cannot be re-compressed without password. Original preserved without alteration.',
      warnings: ['Document is encrypted/password-protected; preserved original'],
      hasImages: false,
      imagesOptimizedCount: 0,
    }
  }

  // Check for catalog permissions or signature fields
  if (Boolean(doc.catalog?.get(PDFName.of('Perms')))) {
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount,
      isOptimized: false,
      mode,
      message:
        'Signed or permission-locked PDF detected. Document preserved byte-for-byte to protect integrity.',
      warnings: ['Document has catalog permission locks; preserved original'],
      hasImages: false,
      imagesOptimizedCount: 0,
    }
  }

  // 4C. Handle Dynamic XFA Forms (Requirement 3 & 4)
  // Dynamic XML Forms Architecture (XFA) templates are proprietary and must not be altered.
  const acroForm = doc.catalog.get(PDFName.of('AcroForm'))
  const hasXfa = acroForm instanceof PDFDict && Boolean(acroForm.get(PDFName.of('XFA')))
  if (hasXfa) {
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount,
      isOptimized: false,
      mode,
      message:
        'Dynamic XFA form detected. Document preserved byte-for-byte to protect interactive dynamic form architecture.',
      warnings: ['Document contains dynamic XFA forms; preserved original'],
      hasImages: false,
      imagesOptimizedCount: 0,
    }
  }

  // Mode settings
  let targetJpegQuality = 72
  let maxImageDimension = 1600

  if (mode === 'highQuality') {
    targetJpegQuality = 85
    maxImageDimension = options.maxImageWidth || 2400
  } else if (mode === 'maximum') {
    targetJpegQuality = 55
    maxImageDimension = options.maxImageWidth || 1280
  } else {
    // balanced default
    targetJpegQuality = 72
    maxImageDimension = options.maxImageWidth || 1600
  }

  let hasImages = false
  let imagesOptimizedCount = 0

  // 5. Inspect and optimize indirect objects (Streams, Images, Uncompressed Streams)
  try {
    const indirectObjects = doc.context.enumerateIndirectObjects()

    for (const [, obj] of indirectObjects) {
      if (!(obj instanceof PDFRawStream) || !obj.dict) continue

      const subtype = obj.dict.get(PDFName.of('Subtype'))
      const filter = obj.dict.get(PDFName.of('Filter'))
      const colorSpace = obj.dict.get(PDFName.of('ColorSpace'))

      // 5A. Embedded JPEG image optimization
      if (subtype?.toString() === '/Image' && filter?.toString() === '/DCTDecode') {
        hasImages = true

        // Only process RGB or standard color space to prevent color distortion on CMYK/separation
        const csStr = colorSpace?.toString() || ''
        const isSafeColorSpace = !csStr || csStr.includes('RGB') || csStr === '/DeviceRGB'

        if (isSafeColorSpace && obj.contents && obj.contents.length > 5000) {
          try {
            const decoded = jpeg.decode(obj.contents, {
              formatAsRGBA: true,
              maxMemoryUsageInMB: 64,
            })

            if (decoded && decoded.width > 0 && decoded.height > 0) {
              const origW = decoded.width
              const origH = decoded.height

              let reencoded: { data: Uint8Array }

              if (origW > maxImageDimension || origH > maxImageDimension) {
                // Downsample image maintaining aspect ratio
                const ratio = Math.min(maxImageDimension / origW, maxImageDimension / origH)
                const targetW = Math.max(1, Math.round(origW * ratio))
                const targetH = Math.max(1, Math.round(origH * ratio))

                const downsampled = downsampleRgba(decoded.data, origW, origH, targetW, targetH)
                reencoded = jpeg.encode({ data: downsampled, width: targetW, height: targetH }, targetJpegQuality)

                // Only replace if size reduction achieved
                if (reencoded.data.length < obj.contents.length * 0.95) {
                  ;(obj as any).contents = reencoded.data
                  obj.dict.set(PDFName.of('Width'), PDFNumber.of(targetW))
                  obj.dict.set(PDFName.of('Height'), PDFNumber.of(targetH))
                  obj.dict.set(PDFName.of('Length'), PDFNumber.of(reencoded.data.length))
                  imagesOptimizedCount++
                }
              } else {
                // Re-encode at target quality without resizing
                reencoded = jpeg.encode(decoded, targetJpegQuality)

                if (reencoded.data.length < obj.contents.length * 0.95) {
                  ;(obj as any).contents = reencoded.data
                  obj.dict.set(PDFName.of('Length'), PDFNumber.of(reencoded.data.length))
                  imagesOptimizedCount++
                }
              }
            }
          } catch (imgErr: any) {
            // Non-fatal: if individual image stream cannot be decoded, leave unchanged
            warnings.push(`Image stream skipped: ${imgErr?.message || 'Unsupported image encoding'}`)
          }
        }
      }

      // 5B. Uncompressed content or data stream compression
      if (!filter && obj.contents && obj.contents.length > 256) {
        try {
          const compressed = zlib.deflateSync(obj.contents, { level: 9 })
          if (compressed.length < obj.contents.length) {
            ;(obj as any).contents = compressed
            obj.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'))
            obj.dict.set(PDFName.of('Length'), PDFNumber.of(compressed.length))
          }
        } catch {
          // Leave stream as-is on failure
        }
      }
    }
  } catch (scanErr: any) {
    warnings.push(`Stream inspection warning: ${scanErr?.message}`)
  }

  // 6. Safe metadata cleanup (strip bloated XMP histories while preserving Info dictionary)
  if (mode !== 'highQuality' && !options.preserveMetadata) {
    try {
      if (doc.catalog.has(PDFName.of('Metadata'))) {
        doc.catalog.delete(PDFName.of('Metadata'))
      }
    } catch {
      // Ignore
    }
  }

  // 7. Serialize PDF with object streams (useObjectStreams: true)
  let optimizedBytes: Uint8Array
  try {
    optimizedBytes = await doc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: Infinity,
    })
  } catch (saveErr: any) {
    warnings.push(`Failed to serialize optimized PDF: ${saveErr?.message}`)
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount,
      isOptimized: false,
      mode,
      message: 'Optimization could not be completed cleanly. Original PDF retained.',
      warnings,
      hasImages,
      imagesOptimizedCount: 0,
    }
  }

  const optimizedBuffer = Buffer.from(optimizedBytes)
  const optimizedSize = optimizedBuffer.length

  // 8. Document validation check: verify output is valid PDF with identical page count
  try {
    if (!isPdfBuffer(optimizedBuffer)) {
      throw new Error('Optimized output lacks valid %PDF- header')
    }
    const validatedDoc = await PDFDocument.load(optimizedBuffer, { ignoreEncryption: true })
    if (validatedDoc.getPageCount() !== pageCount) {
      throw new Error(`Page count mismatch: expected ${pageCount}, got ${validatedDoc.getPageCount()}`)
    }
  } catch (valErr: any) {
    warnings.push(`Post-optimization validation failed: ${valErr?.message}. Reverting to original.`)
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount,
      isOptimized: false,
      mode,
      message: 'Validation failed on compressed output. Original PDF preserved byte-for-byte.',
      warnings,
      hasImages,
      imagesOptimizedCount: 0,
    }
  }

  // 9. Size check: If optimization did not reduce file size (already compressed), retain original
  if (optimizedSize >= originalSize * 0.98) {
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount,
      isOptimized: false,
      mode,
      message: 'PDF is already highly optimized. Original document preserved without modification.',
      warnings,
      hasImages,
      imagesOptimizedCount,
    }
  }

  // 10. Calculate dynamic savings
  const savingsBytes = originalSize - optimizedSize
  const savingsPercent = originalSize > 0 ? parseFloat(((savingsBytes / originalSize) * 100).toFixed(1)) : 0

  let statusMsg = ''
  if (mode === 'maximum') {
    statusMsg = `Maximum compression applied (${savingsPercent}% saved). Text readability fully preserved.`
  } else if (mode === 'highQuality') {
    statusMsg = `High-quality compression applied (${savingsPercent}% saved). High-fidelity visuals preserved.`
  } else {
    statusMsg = `Balanced compression applied (${savingsPercent}% saved). Selectable text and document layout 100% preserved.`
  }

  return {
    buffer: optimizedBuffer,
    originalSize,
    optimizedSize,
    savingsPercent: Math.max(0, savingsPercent),
    pageCount,
    isOptimized: true,
    mode,
    message: statusMsg,
    warnings,
    hasImages,
    imagesOptimizedCount,
  }
}
