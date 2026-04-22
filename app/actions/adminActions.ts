'use server'

import { getDB, saveDB } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export async function updateContent(content: any) {
  try {
    const db = await getDB()
    db.content = { ...db.content, ...content }
    await saveDB(db)
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}

// ─── Upload image to Supabase Storage ─────────────────────────────────────
export async function uploadImage(formData: FormData): Promise<string> {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file uploaded')

  const ext = file.name.split('.').pop()
  const filename = `${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('school-images')          // ← your Supabase Storage bucket name
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(`Image upload failed: ${error.message}`)

  const { data } = supabase.storage
    .from('school-images')
    .getPublicUrl(filename)

  return data.publicUrl
}

export async function addGalleryItem(title: string, formData: FormData) {
  try {
    const src = await uploadImage(formData)
    const db = await getDB()

    const existingCat = db.galleryCategories.find(
      (c: any) => c.title.trim().toLowerCase() === title.trim().toLowerCase()
    )
    if (existingCat) {
      existingCat.images.push({ src, alt: title })
    } else {
      db.galleryCategories.push({
        id: crypto.randomUUID(),
        title,
        thumbnail: src,
        images: [{ src, alt: title }],
      })
    }

    await saveDB(db)
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}

export async function deleteGalleryImage(catId: string, imgIndex: number) {
  try {
    const db = await getDB()
    const cat = db.galleryCategories.find((c: any) => c.id === catId)
    if (cat) {
      cat.images.splice(imgIndex, 1)
      if (cat.images.length === 0) {
        db.galleryCategories = db.galleryCategories.filter((c: any) => c.id !== catId)
      } else {
        cat.thumbnail = cat.images[0].src
      }
      await saveDB(db)
    }
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}

export async function addActivity(title: string, description: string, formData: FormData) {
  try {
    const src = await uploadImage(formData)
    const db = await getDB()

    const existingAct = db.activities.find(
      (a: any) => a.title.trim().toLowerCase() === title.trim().toLowerCase()
    )
    if (existingAct) {
      existingAct.images.push({ src, alt: title })
      if (description) existingAct.description = description
    } else {
      db.activities.push({
        id: crypto.randomUUID(),
        title,
        description,
        thumbnail: src,
        images: [{ src, alt: title }],
      })
    }

    await saveDB(db)
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}

export async function deleteActivityImage(actId: string, imgIndex: number) {
  try {
    const db = await getDB()
    const act = db.activities.find((a: any) => a.id === actId)
    if (act) {
      act.images.splice(imgIndex, 1)
      if (act.images.length === 0) {
        db.activities = db.activities.filter((a: any) => a.id !== actId)
      } else {
        act.thumbnail = act.images[0].src
      }
      await saveDB(db)
    }
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}
