import { PDFDocument, PDFName, PDFNumber, PDFRawStream, EncryptedPDFError, PDFDict } from 'pdf-lib'
import zlib from 'zlib'
import sharp from 'sharp'
import crypto from 'crypto'

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
 * Safe, intelligent server-side PDF optimization engine.
 * 
 * Strict safety rules:
 * 1. Never rasterizes PDF pages into images; selectable text and vector fonts are preserved.
 * 2. Compresses structural objects into Flate-encoded Object Streams (useObjectStreams: true).
 * 3. Compresses uncompressed content/font streams using zlib level 9.
 * 4. Deduplicates identical embedded font and data streams across pages.
 * 5. Optimizes embedded JPEG image streams without corrupting layout, text, or coordinates.
 * 6. Removes bloated XML metadata when safe while preserving Info dictionary metadata.
 * 7. Always validates the resulting document before returning; if invalid or larger, preserves the original.
 * 8. Enforces the 25MB safety upload limit.
 */
export async function optimizePdf(
  inputBuffer: Buffer,
  options: PdfOptimizationOptions = {}
): Promise<PdfOptimizationResult> {
  const originalSize = inputBuffer.length
  const mode = options.mode || 'balanced'
  const warnings: string[] = []

  try {
    // 1. Enforce 25 MB safety limit
    if (originalSize > 26214400) {
      throw new Error('PDF exceeds the maximum allowed limit of 25MB.')
    }

    // 2. Validate header magic bytes
    if (!isPdfBuffer(inputBuffer)) {
      throw new Error('File is not a valid PDF document (missing %PDF- header).')
    }

    // 2B. Fast-path check for Digital Signatures
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

    // 4A. Handle Password-Protected / Encrypted PDFs
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

    // 4C. Handle Dynamic XFA Forms
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
    let targetJpegQuality = 68
    let maxImageDimension = 1400

    if (mode === 'highQuality') {
      targetJpegQuality = 82
      maxImageDimension = options.maxImageWidth || 2000
    } else if (mode === 'maximum') {
      targetJpegQuality = 55
      maxImageDimension = options.maxImageWidth || 1200
    } else {
      // balanced default
      targetJpegQuality = 68
      maxImageDimension = options.maxImageWidth || 1400
    }

    let hasImages = false
    let imagesOptimizedCount = 0

    // 5. Inspect and optimize indirect objects (Streams, Images, Fonts, Deduplication)
    try {
      const indirectObjects = doc.context.enumerateIndirectObjects()
      const deadline = Date.now() + 5000 // 5 seconds maximum serverless CPU time budget
      let imagesProcessed = 0

      for (const [, obj] of indirectObjects) {
        if (Date.now() > deadline) {
          warnings.push('Image optimization paused under serverless CPU time budget')
          break
        }
        if (!(obj instanceof PDFRawStream) || !obj.dict) continue

        const subtype = obj.dict.get(PDFName.of('Subtype'))
        const filter = obj.dict.get(PDFName.of('Filter'))
        const colorSpace = obj.dict.get(PDFName.of('ColorSpace'))

        // 5A. Embedded JPEG image optimization
        if (subtype?.toString() === '/Image' && filter?.toString() === '/DCTDecode') {
          hasImages = true
          if (imagesProcessed >= 25) continue
          imagesProcessed++

          const csStr = colorSpace?.toString() || ''
          const isSafeColorSpace = !csStr || csStr.includes('RGB') || csStr === '/DeviceRGB'

          if (isSafeColorSpace && obj.contents && obj.contents.length > 5000) {
            try {
              const reencoded = await sharp(obj.contents)
                .resize({
                  width: maxImageDimension,
                  height: maxImageDimension,
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .jpeg({ quality: targetJpegQuality, mozjpeg: false })
                .toBuffer()

              if (reencoded.length < obj.contents.length * 0.95) {
                const meta = await sharp(reencoded).metadata()
                if (meta.width && meta.height) {
                  ;(obj as any).contents = reencoded
                  obj.dict.set(PDFName.of('Width'), PDFNumber.of(meta.width))
                  obj.dict.set(PDFName.of('Height'), PDFNumber.of(meta.height))
                  obj.dict.set(PDFName.of('Length'), PDFNumber.of(reencoded.length))
                  imagesOptimizedCount++
                }
              }
            } catch (imgErr: any) {
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

      // 5C. Deduplicate identical streams (e.g. redundant embedded TrueType fonts across multiple pages)
      const streamsByHash = new Map<string, any>()
      const duplicateReplacements = new Map<string, any>()

      for (const [ref, obj] of indirectObjects) {
        if (obj instanceof PDFRawStream && obj.contents && obj.contents.length > 512) {
          const hash = crypto.createHash('sha256').update(obj.contents).digest('hex')
          if (streamsByHash.has(hash)) {
            const canonicalRef = streamsByHash.get(hash)
            duplicateReplacements.set(ref.toString(), canonicalRef)
          } else {
            streamsByHash.set(hash, ref)
          }
        }
      }

      if (duplicateReplacements.size > 0) {
        for (const [, obj] of indirectObjects) {
          const dict = obj instanceof PDFDict ? obj : (obj as any).dict instanceof PDFDict ? (obj as any).dict : null
          if (dict) {
            for (const [key, val] of dict.entries()) {
              const valStr = val?.toString()
              if (valStr && duplicateReplacements.has(valStr)) {
                const canonical = duplicateReplacements.get(valStr)
                dict.set(key, canonical)
              }
            }
          }
        }

        for (const [dupRefStr] of duplicateReplacements) {
          const match = indirectObjects.find(([r]) => r.toString() === dupRefStr)
          if (match) {
            doc.context.delete(match[0])
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
      savingsPercent,
      pageCount,
      isOptimized: true,
      mode,
      message: statusMsg,
      warnings,
      hasImages,
      imagesOptimizedCount,
    }
  } catch (fatalErr: any) {
    return {
      buffer: inputBuffer,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
      pageCount: 1,
      isOptimized: false,
      mode,
      message: 'Optimization failed safely. Original PDF preserved byte-for-byte.',
      warnings: [fatalErr?.message || 'Fatal optimization error'],
      hasImages: false,
      imagesOptimizedCount: 0,
    }
  }
}
