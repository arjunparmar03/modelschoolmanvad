'use server'

import { getDB, saveDB } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export async function updateContent(content: any) {
  const db = await getDB()
  db.content = { ...db.content, ...content }
  await saveDB(db)
  revalidatePath('/')
  return { success: true }
}

export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error("No file uploaded")

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '')}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(path.join(uploadDir, filename), buffer)
  
  return `/uploads/${filename}`
}

export async function addGalleryItem(title: string, formData: FormData) {
  const src = await uploadImage(formData)
  const db = await getDB()
  
  const existingCat = db.galleryCategories.find((c: any) => c.title.trim().toLowerCase() === title.trim().toLowerCase())
  if (existingCat) {
    existingCat.images.push({ src, alt: title })
  } else {
    db.galleryCategories.push({
      id: crypto.randomUUID(),
      title,
      thumbnail: src,
      images: [{ src, alt: title }]
    })
  }
  
  await saveDB(db)
  revalidatePath('/')
  return { success: true }
}

export async function deleteGalleryImage(catId: string, imgIndex: number) {
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
}

export async function addActivity(title: string, description: string, formData: FormData) {
  const src = await uploadImage(formData)
  const db = await getDB()
  
  const existingAct = db.activities.find((a: any) => a.title.trim().toLowerCase() === title.trim().toLowerCase())
  if (existingAct) {
    existingAct.images.push({ src, alt: title })
    if (description) existingAct.description = description
  } else {
    db.activities.push({
      id: crypto.randomUUID(),
      title,
      description,
      thumbnail: src,
      images: [{ src, alt: title }]
    })
  }
  
  await saveDB(db)
  revalidatePath('/')
  return { success: true }
}

export async function deleteActivityImage(actId: string, imgIndex: number) {
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
}
