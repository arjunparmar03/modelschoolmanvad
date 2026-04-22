import { supabase } from './supabase'

export const defaultDB = {
  content: {
    heroHeading: "Model School, Manvad",
    heroSubtitle: "Quality education for classes 6 to 12. Dedicated to academic excellence and student success.",
    email: "modelmanvad@gmail.com"
  },
  galleryCategories: [
    {
      id: 'chemistry',
      title: 'Chemistry Lab',
      thumbnail: '/chemistry-lab.jpg',
      images: [
        { src: '/chemistry-lab.jpg', alt: 'Chemistry Lab 1' },
        { src: '/chemistry-lab-2.jpg', alt: 'Chemistry Lab 2' },
        { src: '/chemistry-lab-3.jpg', alt: 'Chemistry Lab 3' },
      ],
    },
    {
      id: 'physics',
      title: 'Physics Lab',
      thumbnail: '/physics-lab-1.jpg',
      images: [
        { src: '/physics-lab-1.jpg', alt: 'Physics Lab 1' },
        { src: '/physics-lab-2.jpg', alt: 'Physics Lab 2' },
      ],
    },
    {
      id: 'biology',
      title: 'Biology Lab',
      thumbnail: '/bio-lab.jpg',
      images: [{ src: '/bio-lab.jpg', alt: 'Biology Lab' }],
    },
    {
      id: 'playroom',
      title: 'Play Room',
      thumbnail: '/play-room.jpg',
      images: [{ src: '/play-room.jpg', alt: 'Play Room' }],
    },
    {
      id: 'classroom',
      title: 'Classroom View',
      thumbnail: '/classroom.jpg',
      images: [
        { src: '/classroom.jpg', alt: 'Classroom 1' },
        { src: '/classroom-2.jpg', alt: 'Classroom 2' },
      ],
    },
    {
      id: 'drawing',
      title: 'Drawing Room',
      thumbnail: '/drawing-room-1.jpg',
      images: [
        { src: '/drawing-room-1.jpg', alt: 'Drawing Room 1' },
        { src: '/drawing-room-2.jpg', alt: 'Drawing Room 2' },
        { src: '/drawing-room-3.jpg', alt: 'Drawing Room 3' },
      ],
    },
    {
      id: 'atal',
      title: 'Atal Lab',
      thumbnail: '/atal-lab-1.jpg',
      images: [
        { src: '/atal-lab-1.jpg', alt: 'Atal Lab 1' },
        { src: '/atal-lab-2.jpg', alt: 'Atal Lab 2' },
        { src: '/atal-lab-3.jpg', alt: 'Atal Lab 3' },
      ],
    },
    {
      id: 'schoolview',
      title: 'School View',
      thumbnail: '/school-view.jpg',
      images: [{ src: '/school-view.jpg', alt: 'School View' }],
    },
    {
      id: 'vocational',
      title: 'Vocational Lab',
      thumbnail: '/vocational-lab.jpg',
      images: [{ src: '/vocational-lab.jpg', alt: 'Vocational Lab' }],
    },
    {
      id: 'corridor',
      title: 'Corridor',
      thumbnail: '/corridor.jpg',
      images: [{ src: '/corridor.jpg', alt: 'Corridor' }],
    },
    {
      id: 'prayer',
      title: 'Prayer Area',
      thumbnail: '/prayer-area-1.jpg',
      images: [
        { src: '/prayer-area-1.jpg', alt: 'Prayer Area 1' },
        { src: '/prayer-area-2.jpg', alt: 'Prayer Area 2' },
        { src: '/prayer-area-3.jpg', alt: 'Prayer Area 3' },
      ],
    },
    {
      id: 'greenSchool',
      title: 'Green School',
      thumbnail: '/green-school-1.jpg',
      images: [
        { src: '/green-school-1.jpg', alt: 'Green School 1' },
        { src: '/green-school-2.jpg', alt: 'Green School 2' },
      ],
    }
  ],
  activities: [
    {
      id: 'yoga',
      title: 'Yoga & Sports',
      description: 'Physical fitness and wellness programs including yoga and outdoor sports activities',
      thumbnail: '/yoga-sports.jpg',
      images: [{ src: '/yoga-sports.jpg', alt: 'Yoga and Sports Activities' }],
    },
    {
      id: 'vocational-edu',
      title: 'Vocational Education',
      description: 'Skill-based education programs developing practical expertise and professional skills',
      thumbnail: '/vocational-education.jpg',
      images: [{ src: '/vocational-education.jpg', alt: 'Vocational Education' }],
    },
    {
      id: 'health',
      title: 'Health Awareness',
      description: 'Health awareness campaigns and wellness programs including blood checking drives',
      thumbnail: '/health-awareness.jpg',
      images: [{ src: '/health-awareness.jpg', alt: 'Health Awareness' }],
    },
  ]
}

// ─── Read data from Supabase ───────────────────────────────────────────────
export async function getDB() {
  const { data, error } = await supabase
    .from('cms_data')
    .select('value')
    .eq('key', 'main')
    .single()

  if (error || !data) {
    // First time: seed the default data into Supabase
    await saveDB(defaultDB)
    return defaultDB
  }

  const parsed = data.value as any

  // Migration: if still on old flat gallery/events model
  if (!parsed.galleryCategories) {
    parsed.galleryCategories = defaultDB.galleryCategories
    parsed.activities = defaultDB.activities
    delete parsed.gallery
    delete parsed.events
    await saveDB(parsed)
  }

  return parsed
}

// ─── Write data to Supabase ────────────────────────────────────────────────
export async function saveDB(data: any) {
  const { error } = await supabase
    .from('cms_data')
    .upsert({ key: 'main', value: data }, { onConflict: 'key' })

  if (error) {
    throw new Error(`Failed to save to Supabase: ${error.message}`)
  }
}
