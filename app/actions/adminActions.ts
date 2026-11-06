'use server'

import { getDB, saveDB } from '@/lib/db'
import { revalidatePath, revalidateTag } from 'next/cache'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@/utils/supabase/server'
import { NOTICE_CATEGORIES, NoticeCategory, getTodayIST } from '@/lib/notices'
import { optimizeImage } from '@/lib/image-optimizer'
import { optimizePdf, isPdfBuffer } from '@/lib/pdf-optimizer'

/**
 * Defense-in-depth: Verifies that the request is made by an authenticated
 * Supabase user with the trusted admin role in app_metadata.
 */
async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized: Authentication required.')
  }

  if (user.app_metadata?.role !== 'admin') {
    throw new Error('Forbidden: Administrator privileges required.')
  }

  return user
}

export async function updateContent(content: any) {
  try {
    await requireAdmin()
    const db = await getDB()
    db.content = { ...db.content, ...content }
    await saveDB(db)
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL STORAGE ADAPTER (DEPRECATED)
 * ─────────────────────────────────────────────────────────────────────────────
 * Retained for backwards compatibility. All media uploads are handled directly
 * through Supabase Storage bucket 'school-media'.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function uploadImage(formData: FormData): Promise<string> {
  await requireAdmin()
  const file = formData.get('file') as File
  if (!file) throw new Error('No file uploaded')

  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })
    const filePath = path.join(uploadsDir, filename)
    await fs.writeFile(filePath, buffer)
    return `/uploads/${filename}`
  } catch {
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'
    return `data:${mimeType};base64,${base64}`
  }
}

/**
 * Uploads a gallery photo to the `school-media` Supabase Storage bucket
 * under the `gallery/` folder, and inserts a row into `gallery_images`.
 */
export async function addGalleryItem(categoryName: string, formData: FormData) {
  try {
    await requireAdmin()
    const file = formData.get('file') as File
    if (!file) {
      throw new Error('No image file provided.')
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      throw new Error(`Unsupported image format (${file.type}). Allowed types: JPG, PNG, WebP, GIF.`)
    }

    // Validate size (25MB limit)
    if (file.size > 26214400) {
      throw new Error('Image file exceeds maximum allowed limit of 25MB.')
    }

    const cleanCategory = categoryName.trim()
    if (!cleanCategory) {
      throw new Error('Category name cannot be empty.')
    }

    const bytes = await file.arrayBuffer()
    const rawBuffer = Buffer.from(bytes)

    // Apply intelligent adaptive image optimization
    const optResult = await optimizeImage(rawBuffer, {
      moduleContext: 'gallery',
      maxWidth: 1600,
      maxHeight: 1600,
    })

    const filename = `${crypto.randomUUID()}.${optResult.extension}`
    const storagePath = `gallery/${filename}`

    const supabase = await createClient()

    // 1. Upload optimized image to Supabase Storage bucket 'school-media'
    const { error: uploadError } = await supabase.storage
      .from('school-media')
      .upload(storagePath, optResult.buffer, {
        contentType: optResult.contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Supabase Storage Upload Error]:', uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // 2. Retrieve public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('school-media').getPublicUrl(storagePath)

    // 3. Insert record into `gallery_images` table
    const imageTitle = `${cleanCategory} - ${new Date().toLocaleDateString('en-GB')}`
    const { data: inserted, error: insertError } = await supabase
      .from('gallery_images')
      .insert({
        title: imageTitle,
        category: cleanCategory,
        image_url: publicUrl,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Supabase Gallery Insert Error]:', insertError)
      // Rollback uploaded storage object if database insert fails
      await supabase.storage.from('school-media').remove([storagePath])
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    // Revalidate paths
    revalidatePath('/')
    revalidatePath('/campus')
    revalidatePath('/admin/gallery')
    revalidateTag('campus-gallery', 'default')

    return { success: true, data: inserted }
  } catch (error: any) {
    console.error('[addGalleryItem Error]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Deletes a gallery image by its immutable UUID.
 *
 * If the image URL belongs to the project's `school-media` Storage bucket under `gallery/`,
 * it safely removes the Storage object as well. Local public images (e.g. `/chemistry-lab.jpg`)
 * are never removed from the filesystem.
 *
 * Backward-compatible: If a category name and index are passed (legacy fallback),
 * it queries the matching database record by category and index.
 */
export async function deleteGalleryImage(idOrCatId: string, imgIndex?: number) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    let targetRow: { id: string; image_url: string; category: string } | null = null

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCatId)

    if (isUUID) {
      // Primary: Look up by immutable UUID
      const { data, error } = await supabase
        .from('gallery_images')
        .select('id, image_url, category')
        .eq('id', idOrCatId)
        .maybeSingle()

      if (error) {
        console.error('[Supabase Gallery Fetch Error]:', error)
        throw new Error(`Failed to locate image: ${error.message}`)
      }
      targetRow = data
    } else if (imgIndex !== undefined) {
      // Fallback: Look up by category name and index
      const { data, error } = await supabase
        .from('gallery_images')
        .select('id, image_url, category')
        .ilike('category', idOrCatId)
        .order('created_at', { ascending: true })

      if (data && data[imgIndex]) {
        targetRow = data[imgIndex]
      }
    }

    if (!targetRow) {
      // If no database row was found, check if it's in localCMSStore (for pre-migration local fallback)
      const db = await getDB()
      const cat = db.galleryCategories.find(
        (c: any) => c.id === idOrCatId || c.title.toLowerCase() === idOrCatId.toLowerCase()
      )
      if (cat && imgIndex !== undefined) {
        cat.images.splice(imgIndex, 1)
        if (cat.images.length === 0) {
          db.galleryCategories = db.galleryCategories.filter((c: any) => c !== cat)
        } else {
          cat.thumbnail = cat.images[0].src
        }
        await saveDB(db)
        revalidatePath('/')
        revalidatePath('/campus')
        revalidatePath('/admin/gallery')
        revalidateTag('campus-gallery', 'default')
        return { success: true }
      }
      throw new Error('Gallery image record not found.')
    }

    // 1. Storage cleanup: Verify URL belongs to school-media bucket before deleting
    const imageUrl = targetRow.image_url || ''
    const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
    const storagePrefix = `${projectUrl}/storage/v1/object/public/school-media/`
    const genericStoragePattern = /\/storage\/v1\/object\/public\/school-media\/(.+)$/

    let relativeStoragePath: string | null = null

    if (imageUrl.startsWith(storagePrefix)) {
      relativeStoragePath = imageUrl.slice(storagePrefix.length)
    } else {
      const match = imageUrl.match(genericStoragePattern)
      if (match && match[1]) {
        relativeStoragePath = match[1]
      }
    }

    // Only delete storage objects in 'gallery/' folder in 'school-media'
    if (relativeStoragePath && relativeStoragePath.startsWith('gallery/')) {
      console.log(`[Storage Cleanup] Deleting verified Storage file: ${relativeStoragePath}`)
      const { error: storageError } = await supabase.storage
        .from('school-media')
        .remove([relativeStoragePath])

      if (storageError) {
        console.warn('[Storage Cleanup Warning]: Storage removal failed:', storageError.message)
      }
    } else {
      // Local seed files (e.g. /chemistry-lab.jpg) or external assets are NEVER deleted from filesystem
      console.log(`[Storage Cleanup] Preserving non-storage file: ${imageUrl}`)
    }

    // 2. Database cleanup: Delete the row from gallery_images
    const { error: dbDeleteError } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', targetRow.id)

    if (dbDeleteError) {
      console.error('[Supabase Gallery Delete Error]:', dbDeleteError)
      throw new Error(`Failed to delete gallery record: ${dbDeleteError.message}`)
    }

    // Revalidate cached paths
    revalidatePath('/')
    revalidatePath('/campus')
    revalidatePath('/admin/gallery')
    revalidateTag('campus-gallery', 'default')

    return { success: true }
  } catch (error: any) {
    console.error('[deleteGalleryImage Error]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Uploads an activity photo to `school-media/activities/{uuid}.{ext}` in Supabase Storage,
 * associates it with the matching activity (or creates a new one), and inserts a record into `activity_images`.
 *
 * Title matching is case-insensitive and trims whitespace to align with the unique constraint.
 * If creating a new activity succeeds but inserting its first image fails, both the uploaded
 * Storage object and newly created activity record are rolled back.
 */
export async function addActivity(title: string, description: string, formData: FormData) {
  try {
    await requireAdmin()
    const file = formData.get('file') as File
    if (!file) {
      throw new Error('No image file provided.')
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      throw new Error(`Unsupported image format (${file.type}). Allowed types: JPG, PNG, WebP, GIF.`)
    }

    // Validate size (25MB limit)
    if (file.size > 26214400) {
      throw new Error('Image file exceeds maximum allowed limit of 25MB.')
    }

    const cleanTitle = title.trim()
    if (!cleanTitle) {
      throw new Error('Activity name cannot be empty.')
    }

    const cleanDesc = description?.trim() || cleanTitle
    const bytes = await file.arrayBuffer()
    const rawBuffer = Buffer.from(bytes)

    // Apply intelligent adaptive image optimization
    const optResult = await optimizeImage(rawBuffer, {
      moduleContext: 'activities',
      maxWidth: 1600,
      maxHeight: 1600,
    })

    const filename = `${crypto.randomUUID()}.${optResult.extension}`
    const storagePath = `activities/${filename}`

    const supabase = await createClient()

    // 1. Upload optimized image to Supabase Storage bucket 'school-media' under 'activities/'
    const { error: uploadError } = await supabase.storage
      .from('school-media')
      .upload(storagePath, optResult.buffer, {
        contentType: optResult.contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Supabase Storage Upload Error]:', uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // 2. Retrieve public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('school-media').getPublicUrl(storagePath)

    // 3. Database operations with coordinated rollback
    let activityId: string
    let createdNewActivity = false

    // Check if an activity with this title already exists (case-insensitive & trimmed)
    const { data: existingAct, error: searchError } = await supabase
      .from('activities')
      .select('id, title, description')
      .ilike('title', cleanTitle)
      .maybeSingle()

    if (searchError) {
      console.error('[Supabase Activity Search Error]:', searchError)
      await supabase.storage.from('school-media').remove([storagePath])
      throw new Error(`Database query failed: ${searchError.message}`)
    }

    if (existingAct) {
      activityId = existingAct.id
      // If a non-empty description is provided, update the activity description
      if (description?.trim() && description.trim() !== existingAct.description) {
        await supabase
          .from('activities')
          .update({ description: cleanDesc })
          .eq('id', activityId)
      }
    } else {
      // Create new activity
      const { data: newAct, error: actError } = await supabase
        .from('activities')
        .insert({
          title: cleanTitle,
          description: cleanDesc,
          image_url: publicUrl,
        })
        .select('id')
        .single()

      if (actError) {
        console.error('[Supabase Activity Insert Error]:', actError)
        // Rollback uploaded storage object
        await supabase.storage.from('school-media').remove([storagePath])
        throw new Error(`Failed to create activity: ${actError.message}`)
      }

      activityId = newAct.id
      createdNewActivity = true
    }

    // 4. Insert image into canonical `activity_images` table
    const { data: imgRow, error: imgError } = await supabase
      .from('activity_images')
      .insert({
        activity_id: activityId,
        image_url: publicUrl,
        caption: cleanTitle,
      })
      .select()
      .single()

    if (imgError) {
      console.error('[Supabase Activity Image Insert Error]:', imgError)
      // Rollback Storage file
      await supabase.storage.from('school-media').remove([storagePath])

      // If activity was just created, rollback newly created activity so no empty record is left
      if (createdNewActivity) {
        await supabase.from('activities').delete().eq('id', activityId)
      }

      throw new Error(`Failed to attach image to activity: ${imgError.message}`)
    }

    // Revalidate paths
    revalidatePath('/')
    revalidatePath('/campus')
    revalidatePath('/admin/activities')
    revalidateTag('campus-activities', 'default')

    return { success: true, data: imgRow }
  } catch (error: any) {
    console.error('[addActivity Error]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Deletes a single image from `activity_images` by its immutable UUID.
 *
 * Sequence:
 * 1. Authenticate admin authorization.
 * 2. Look up the record by UUID to verify existence and extract storage URL.
 * 3. Perform database deletion first.
 * 4. Attempt Storage cleanup. If Storage cleanup fails, log the orphaned file.
 * 5. Local public images (e.g. `/yoga-sports.jpg`) are never deleted from disk.
 * 6. The parent activity is preserved even if photos are deleted.
 */
export async function deleteActivityImage(imageIdOrActId: string, imgIndex?: number) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    let targetImage: { id: string; activity_id: string; image_url: string } | null = null

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageIdOrActId)

    if (isUUID) {
      // 1. Primary: Lookup directly by immutable image UUID in activity_images
      const { data: imgRow, error: imgError } = await supabase
        .from('activity_images')
        .select('id, activity_id, image_url')
        .eq('id', imageIdOrActId)
        .maybeSingle()

      if (imgError) {
        console.error('[Supabase Activity Image Fetch Error]:', imgError)
      }

      if (imgRow) {
        targetImage = imgRow
      } else {
        // 2. Secondary: If not found as image ID, maybe imageIdOrActId is an activity UUID
        const { data: actImages, error: actError } = await supabase
          .from('activity_images')
          .select('id, activity_id, image_url')
          .eq('activity_id', imageIdOrActId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })

        if (actError) {
          console.error('[Supabase Activity Images For Activity Fetch Error]:', actError)
        }

        if (actImages && actImages.length > 0) {
          const targetIdx = (imgIndex !== undefined && imgIndex >= 0 && imgIndex < actImages.length) ? imgIndex : 0
          targetImage = actImages[targetIdx]
        }
      }
    }

    if (!targetImage) {
      // Fallback: Check localCMSStore in pre-migration mode
      const db = await getDB()
      let foundAct = db.activities.find((a: any) => a.id === imageIdOrActId)
      let foundIdx = imgIndex

      if (!foundAct) {
        for (const a of db.activities) {
          const idx = a.images.findIndex((img: any, i: number) => 
            (img.id && img.id === imageIdOrActId) || `${a.id}-${i}` === imageIdOrActId
          )
          if (idx !== -1) {
            foundAct = a
            foundIdx = idx
            break
          }
        }
      }

      if (foundAct && foundIdx !== undefined && foundIdx >= 0 && foundAct.images[foundIdx]) {
        foundAct.images.splice(foundIdx, 1)
        await saveDB(db)
        revalidatePath('/')
        revalidatePath('/campus')
        revalidatePath('/admin/activities')
        revalidateTag('campus-activities', 'default')
        return { success: true }
      }
      throw new Error('Activity image record not found.')
    }

    const imageUrl = targetImage.image_url

    // 1. First perform the database deletion with proper authorization
    const { error: dbDeleteError } = await supabase
      .from('activity_images')
      .delete()
      .eq('id', targetImage.id)

    if (dbDeleteError) {
      console.error('[Supabase Activity Image Delete Error]:', dbDeleteError)
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`)
    }

    // 2. Then attempt Storage cleanup
    const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
    const storagePrefix = `${projectUrl}/storage/v1/object/public/school-media/`
    const genericStoragePattern = /\/storage\/v1\/object\/public\/school-media\/(.+)$/

    let relativeStoragePath: string | null = null

    if (imageUrl.startsWith(storagePrefix)) {
      relativeStoragePath = imageUrl.slice(storagePrefix.length)
    } else {
      const match = imageUrl.match(genericStoragePattern)
      if (match && match[1]) {
        relativeStoragePath = match[1]
      }
    }

    // Only delete storage objects verified to belong to school-media/activities/
    if (relativeStoragePath && relativeStoragePath.startsWith('activities/')) {
      console.log(`[Storage Cleanup] Deleting verified Storage file: ${relativeStoragePath}`)
      const { error: storageError } = await supabase.storage
        .from('school-media')
        .remove([relativeStoragePath])

      if (storageError) {
        console.error(
          '[Storage Cleanup Failed]: Orphaned file requires manual cleanup in school-media bucket:',
          relativeStoragePath,
          storageError.message
        )
      }
    } else {
      // Local seed files (e.g. /yoga-sports.jpg) are NEVER deleted from disk
      console.log(`[Storage Cleanup] Preserving non-storage / local path: ${imageUrl}`)
    }

    // Revalidate cached paths
    revalidatePath('/')
    revalidatePath('/campus')
    revalidatePath('/admin/activities')
    revalidateTag('campus-activities', 'default')

    return { success: true }
  } catch (error: any) {
    console.error('[deleteActivityImage Error]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Deletes an entire activity and all of its associated images.
 *
 * Sequence:
 * 1. Authenticate admin authorization.
 * 2. Retrieve all child images to record Storage URLs.
 * 3. Perform database deletion on `activities` table (child `activity_images` cascade-deleted).
 * 4. Attempt Storage cleanup for verified `school-media/activities/` objects.
 * 5. Revalidate cached paths.
 */
export async function deleteActivity(activityId: string) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    // 1. Fetch all child images for storage reference
    const { data: images } = await supabase
      .from('activity_images')
      .select('image_url')
      .eq('activity_id', activityId)

    // 2. Perform database deletion on activities
    const { error: deleteError } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId)

    if (deleteError) {
      console.error('[Supabase Activity Delete Error]:', deleteError)
      throw new Error(`Failed to delete activity: ${deleteError.message}`)
    }

    // 3. Attempt Storage cleanup for all deleted images
    if (images && images.length > 0) {
      const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
      const storagePrefix = `${projectUrl}/storage/v1/object/public/school-media/`
      const genericStoragePattern = /\/storage\/v1\/object\/public\/school-media\/(.+)$/

      const storagePathsToRemove: string[] = []

      for (const img of images) {
        const url = img.image_url || ''
        let relPath: string | null = null
        if (url.startsWith(storagePrefix)) {
          relPath = url.slice(storagePrefix.length)
        } else {
          const match = url.match(genericStoragePattern)
          if (match && match[1]) {
            relPath = match[1]
          }
        }
        if (relPath && relPath.startsWith('activities/')) {
          storagePathsToRemove.push(relPath)
        }
      }

      if (storagePathsToRemove.length > 0) {
        console.log(`[Storage Cleanup] Removing ${storagePathsToRemove.length} activity image files from Storage`)
        const { error: removeError } = await supabase.storage
          .from('school-media')
          .remove(storagePathsToRemove)

        if (removeError) {
          console.error(
            '[Storage Cleanup Failed]: Orphaned files require manual cleanup:',
            storagePathsToRemove,
            removeError.message
          )
        }
      }
    }

    // Also update localCMSStore if present
    const db = await getDB()
    db.activities = db.activities.filter((a: any) => a.id !== activityId)
    await saveDB(db)

    // Revalidate cached paths
    revalidatePath('/')
    revalidatePath('/campus')
    revalidatePath('/admin/activities')
    revalidateTag('campus-activities', 'default')

    return { success: true }
  } catch (error: any) {
    console.error('[deleteActivity Error]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTICES MANAGEMENT SERVER ACTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforces defense-in-depth admin authorization, strict file validation (SVGs rejected),
 * dedicated private bucket 'school-notices' storage, atomic multi-file upload rollback,
 * and reliable orphan logging if storage removal encounters issues.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ALLOWED_ATTACHMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

function validateAttachmentFile(file: File) {
  const fileName = file.name || ''
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  // Strictly reject SVG to eliminate stored XSS risks
  if (ext === 'svg' || file.type.includes('svg')) {
    throw new Error('SVG files are strictly disallowed for security reasons.')
  }

  if (!ALLOWED_ATTACHMENT_MIMES.includes(file.type)) {
    throw new Error(`Unsupported file type (${file.type}). Allowed types: PDF, JPG, PNG, WebP, GIF.`)
  }

  if (file.size > 26214400) {
    throw new Error(`File "${fileName}" exceeds the maximum allowed limit of 25MB.`)
  }

  const isPdf = file.type === 'application/pdf' || ext === 'pdf'
  const fileType: 'pdf' | 'image' = isPdf ? 'pdf' : 'image'

  return { ext, fileType }
}

export interface CreateNoticeInput {
  title: string
  description: string
  notice_type: NoticeCategory
  publish_date?: string
  expiry_date?: string | null
  is_published?: boolean
}

/**
 * Creates a new notice with optional initial attachments.
 * If any attachment upload fails, rolls back all newly created Storage objects and the notice record.
 */
export async function createNotice(formData: FormData) {
  const uploadedStoragePaths: string[] = []
  let createdNoticeId: string | null = null

  try {
    await requireAdmin()
    const supabase = await createClient()

    const title = ((formData.get('title') as string) || '').trim()
    const description = ((formData.get('description') as string) || '').trim()
    const notice_type = ((formData.get('notice_type') as string) || '').trim() as NoticeCategory
    const publish_date = ((formData.get('publish_date') as string) || '').trim() || getTodayIST()
    const expiry_date_raw = ((formData.get('expiry_date') as string) || '').trim()
    const expiry_date = expiry_date_raw ? expiry_date_raw : null
    const is_published = formData.get('is_published') === 'true'

    if (!title) throw new Error('Notice title is required.')
    if (!description) throw new Error('Notice description is required.')
    if (!NOTICE_CATEGORIES.includes(notice_type)) {
      throw new Error(`Invalid notice category. Must be one of: ${NOTICE_CATEGORIES.join(', ')}`)
    }

    // 1. Insert notice into public.notices
    const { data: newNotice, error: noticeInsertError } = await supabase
      .from('notices')
      .insert({
        title,
        description,
        notice_type,
        publish_date,
        expiry_date,
        is_published,
      })
      .select('id, title, notice_type')
      .single()

    if (noticeInsertError || !newNotice) {
      console.error('[Supabase Notice Insert Error]:', noticeInsertError)
      throw new Error(`Failed to create notice: ${noticeInsertError?.message || 'Unknown database error'}`)
    }

    createdNoticeId = newNotice.id

    // 2. Process attached files (if any)
    const files = formData.getAll('files') as File[]
    const validFiles = files.filter((f) => f && f.size > 0 && f.name)

    const attachmentsToInsert: any[] = []

    for (let idx = 0; idx < validFiles.length; idx++) {
      const file = validFiles[idx]
      const { ext, fileType } = validateAttachmentFile(file)

      const attachmentId = crypto.randomUUID()
      const bytes = await file.arrayBuffer()
      const rawBuffer = Buffer.from(bytes)

      let uploadBuffer: Buffer
      let uploadContentType: string
      let uploadExt = ext
      let recordedFileSize = file.size

      const isPdf = isPdfBuffer(rawBuffer) || fileType === 'pdf'

      if (isPdf) {
        const pdfResult = await optimizePdf(rawBuffer, { mode: 'balanced' })
        uploadBuffer = pdfResult.buffer
        uploadContentType = 'application/pdf'
        uploadExt = 'pdf'
        recordedFileSize = pdfResult.optimizedSize
      } else {
        const optResult = await optimizeImage(rawBuffer, {
          moduleContext: 'notices',
          maxWidth: 1280,
          maxHeight: 1280,
        })
        uploadBuffer = optResult.buffer
        uploadContentType = optResult.contentType
        uploadExt = optResult.extension
        recordedFileSize = optResult.optimizedSize
      }

      const storagePath = `notices/${createdNoticeId}/${attachmentId}.${uploadExt}`

      // Upload to private bucket 'school-notices'
      const { error: uploadError } = await supabase.storage
        .from('school-notices')
        .upload(storagePath, uploadBuffer, {
          contentType: uploadContentType,
          upsert: false,
        })

      if (uploadError) {
        console.error(`[Storage Upload Error for ${file.name}]:`, uploadError)
        throw new Error(`Failed to upload attachment "${file.name}": ${uploadError.message}`)
      }

      uploadedStoragePaths.push(storagePath)

      // Stable internal download reference, NEVER storing temporary signed URLs
      const stableDownloadUrl = `/api/notices/download/${attachmentId}`

      attachmentsToInsert.push({
        id: attachmentId,
        notice_id: createdNoticeId,
        file_path: storagePath,
        file_url: stableDownloadUrl,
        file_name: file.name,
        file_type: fileType,
        file_size: recordedFileSize,
        sort_order: idx,
      })
    }

    // 3. Batch insert attachment records if files were provided
    if (attachmentsToInsert.length > 0) {
      const { error: attachError } = await supabase
        .from('notice_attachments')
        .insert(attachmentsToInsert)

      if (attachError) {
        console.error('[Supabase Notice Attachments Insert Error]:', attachError)
        throw new Error(`Failed to save attachment records: ${attachError.message}`)
      }
    }

    // Revalidate affected cached pages
    revalidatePath('/')
    revalidatePath('/notices')
    revalidatePath('/admin/notices')
    revalidateTag('public-notices', 'default')

    return { success: true, noticeId: createdNoticeId }
  } catch (error: any) {
    console.error('[createNotice Rollback Initiated]:', error)

    // Coordinated Rollback: Remove all uploaded storage files
    if (uploadedStoragePaths.length > 0) {
      const supabase = await createClient()
      const { error: cleanupErr } = await supabase.storage
        .from('school-notices')
        .remove(uploadedStoragePaths)

      if (cleanupErr) {
        console.error('[Rollback Storage Cleanup Failed]: Orphaned paths:', uploadedStoragePaths, cleanupErr.message)
      }
    }

    // Coordinated Rollback: Remove newly created notice record
    if (createdNoticeId) {
      const supabase = await createClient()
      await supabase.from('notices').delete().eq('id', createdNoticeId)
    }

    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Updates metadata for an existing notice.
 */
export async function updateNotice(
  id: string,
  data: Partial<{
    title: string
    description: string
    notice_type: NoticeCategory
    publish_date: string
    expiry_date: string | null
    is_published: boolean
  }>
) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    if (data.notice_type && !NOTICE_CATEGORIES.includes(data.notice_type)) {
      throw new Error(`Invalid notice category. Must be one of: ${NOTICE_CATEGORIES.join(', ')}`)
    }

    const payload: any = {
      updated_at: new Date().toISOString(),
    }

    if (data.title !== undefined) payload.title = data.title.trim()
    if (data.description !== undefined) payload.description = data.description.trim()
    if (data.notice_type !== undefined) payload.notice_type = data.notice_type
    if (data.publish_date !== undefined) payload.publish_date = data.publish_date
    if (data.expiry_date !== undefined) payload.expiry_date = data.expiry_date ? data.expiry_date : null
    if (data.is_published !== undefined) payload.is_published = data.is_published

    const { error } = await supabase.from('notices').update(payload).eq('id', id)

    if (error) {
      console.error('[updateNotice Error]:', error)
      throw new Error(`Failed to update notice: ${error.message}`)
    }

    revalidatePath('/')
    revalidatePath('/notices')
    revalidatePath('/admin/notices')
    revalidateTag('public-notices', 'default')

    return { success: true }
  } catch (error: any) {
    console.error('[updateNotice Exception]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Toggles a notice between draft and published status inline.
 */
export async function toggleNoticePublishStatus(id: string, isPublished: boolean) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { error } = await supabase
      .from('notices')
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('[toggleNoticePublishStatus Error]:', error)
      throw new Error(`Failed to update status: ${error.message}`)
    }

    revalidatePath('/')
    revalidatePath('/notices')
    revalidatePath('/admin/notices')
    revalidateTag('public-notices', 'default')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Uploads an additional attachment to an existing notice.
 */
export async function uploadNoticeAttachment(noticeId: string, formData: FormData) {
  let uploadedPath: string | null = null

  try {
    await requireAdmin()
    const supabase = await createClient()

    const file = formData.get('file') as File
    if (!file || file.size === 0) {
      throw new Error('No valid file provided for upload.')
    }

    const { ext, fileType } = validateAttachmentFile(file)
    const attachmentId = crypto.randomUUID()

    const bytes = await file.arrayBuffer()
    const rawBuffer = Buffer.from(bytes)

    let uploadBuffer: Buffer
    let uploadContentType: string
    let uploadExt = ext
    let recordedFileSize = file.size

    const isPdf = isPdfBuffer(rawBuffer) || fileType === 'pdf'

    if (isPdf) {
      const pdfResult = await optimizePdf(rawBuffer, { mode: 'balanced' })
      uploadBuffer = pdfResult.buffer
      uploadContentType = 'application/pdf'
      uploadExt = 'pdf'
      recordedFileSize = pdfResult.optimizedSize
    } else {
      const optResult = await optimizeImage(rawBuffer, {
        moduleContext: 'notices',
        maxWidth: 1280,
        maxHeight: 1280,
      })
      uploadBuffer = optResult.buffer
      uploadContentType = optResult.contentType
      uploadExt = optResult.extension
      recordedFileSize = optResult.optimizedSize
    }

    const storagePath = `notices/${noticeId}/${attachmentId}.${uploadExt}`

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('school-notices')
      .upload(storagePath, uploadBuffer, {
        contentType: uploadContentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[uploadNoticeAttachment Storage Error]:', uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    uploadedPath = storagePath

    // 2. Insert attachment record
    const stableDownloadUrl = `/api/notices/download/${attachmentId}`

    const { data: inserted, error: insertError } = await supabase
      .from('notice_attachments')
      .insert({
        id: attachmentId,
        notice_id: noticeId,
        file_path: storagePath,
        file_url: stableDownloadUrl,
        file_name: file.name,
        file_type: fileType,
        file_size: recordedFileSize,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[uploadNoticeAttachment DB Error]:', insertError)
      throw new Error(`Database record creation failed: ${insertError.message}`)
    }

    revalidatePath('/')
    revalidatePath('/notices')
    revalidatePath('/admin/notices')
    revalidateTag('public-notices', 'default')

    return { success: true, data: inserted }
  } catch (error: any) {
    // Rollback uploaded file if DB insert fails
    if (uploadedPath) {
      const supabase = await createClient()
      await supabase.storage.from('school-notices').remove([uploadedPath])
    }
    console.error('[uploadNoticeAttachment Exception]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Registers an attachment record for files uploaded directly to Supabase Storage.
 * Essential for large files (> 4MB) to safely bypass Vercel serverless function body size limits.
 */
export async function registerNoticeAttachmentRecord(data: {
  noticeId: string
  filePath: string
  fileName: string
  fileType: 'pdf' | 'image'
  fileSize: number
}) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const attachmentId = crypto.randomUUID()
    const stableDownloadUrl = `/api/notices/download/${attachmentId}`

    const { data: inserted, error: insertError } = await supabase
      .from('notice_attachments')
      .insert({
        id: attachmentId,
        notice_id: data.noticeId,
        file_path: data.filePath,
        file_url: stableDownloadUrl,
        file_name: data.fileName,
        file_type: data.fileType,
        file_size: data.fileSize,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[registerNoticeAttachmentRecord Error]:', insertError)
      throw new Error(`Failed to record attachment: ${insertError.message}`)
    }

    revalidatePath('/')
    revalidatePath('/notices')
    revalidatePath('/admin/notices')
    revalidateTag('public-notices', 'default')

    return { success: true, data: inserted }
  } catch (error: any) {
    console.error('[registerNoticeAttachmentRecord Exception]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Deletes a single notice attachment by ID.
 * Database-first deletion followed by Storage cleanup with reliable error logging.
 */
export async function deleteNoticeAttachment(attachmentId: string) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    // 1. Fetch attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('notice_attachments')
      .select('id, notice_id, file_path, file_name')
      .eq('id', attachmentId)
      .maybeSingle()

    if (fetchError || !attachment) {
      throw new Error('Attachment record not found.')
    }

    const filePath = attachment.file_path

    // 2. Perform database deletion first
    const { error: dbDeleteError } = await supabase
      .from('notice_attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbDeleteError) {
      console.error('[Supabase Attachment Delete Error]:', dbDeleteError)
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`)
    }

    // 3. Perform Storage cleanup
    let storageCleanupSuccess = true
    let storageErrorMessage: string | null = null

    if (filePath && filePath.startsWith('notices/')) {
      const { error: storageError } = await supabase.storage
        .from('school-notices')
        .remove([filePath])

      if (storageError) {
        storageCleanupSuccess = false
        storageErrorMessage = storageError.message
        console.error(
          `[Storage Cleanup Failed]: Orphaned attachment file requiring manual cleanup: ${filePath} (Attachment ID: ${attachmentId}) - ${storageError.message}`
        )
      }
    }

    revalidatePath('/')
    revalidatePath('/notices')
    revalidatePath('/admin/notices')
    revalidateTag('public-notices', 'default')

    if (!storageCleanupSuccess) {
      return {
        success: true,
        warning: `Database record deleted, but Storage cleanup failed for file: ${filePath}. Error: ${storageErrorMessage}`,
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[deleteNoticeAttachment Exception]:', error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Deletes an entire notice and all of its associated attachments.
 * Database-first deletion (cascades to notice_attachments), followed by Storage cleanup.
 * Logs exact remaining orphaned file paths if Storage deletion fails.
 */
export async function deleteNotice(noticeId: string) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    // 1. Fetch all child attachment paths before deleting
    const { data: attachments, error: fetchError } = await supabase
      .from('notice_attachments')
      .select('id, file_path')
      .eq('notice_id', noticeId)

    if (fetchError) {
      console.warn('[Notice Attachments Fetch Warning before Delete]:', fetchError.message)
    }

    const storagePathsToRemove: string[] = (attachments || [])
      .map((a) => a.file_path)
      .filter((p) => p && p.startsWith('notices/'))

    // 2. Perform database deletion on notices table (cascades to notice_attachments)
    const { error: deleteError } = await supabase
      .from('notices')
      .delete()
      .eq('id', noticeId)

    if (deleteError) {
      console.error('[Supabase Notice Delete Error]:', deleteError)
      throw new Error(`Failed to delete notice from database: ${deleteError.message}`)
    }

    // 3. Storage cleanup
    let storageCleanupSuccess = true
    let storageErrorMessage: string | null = null

    if (storagePathsToRemove.length > 0) {
      console.log(`[Notice Storage Cleanup] Removing ${storagePathsToRemove.length} files for notice ${noticeId}`)
      const { error: storageError } = await supabase.storage
        .from('school-notices')
        .remove(storagePathsToRemove)

      if (storageError) {
        storageCleanupSuccess = false
        storageErrorMessage = storageError.message
        console.error(
          `[Storage Cleanup Failed]: Orphaned notice attachments requiring manual cleanup for Notice ID: ${noticeId}:`,
          storagePathsToRemove,
          storageError.message
        )
      }
    }

    revalidatePath('/')
    revalidatePath('/notices')
    revalidatePath('/admin/notices')
    revalidateTag('public-notices', 'default')

    if (!storageCleanupSuccess) {
      return {
        success: true,
        warning: `Notice deleted from database, but Storage cleanup encountered errors for ${storagePathsToRemove.length} files. Error: ${storageErrorMessage}`,
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[deleteNotice Exception]:', error)
    return { success: false, error: error.message || String(error) }
  }
}
