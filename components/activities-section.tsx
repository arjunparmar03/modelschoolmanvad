'use client'

import Image from 'next/image'
import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Eye } from 'lucide-react'

const activities = [
  {
    id: 'yoga',
    title: 'Yoga & Sports',
    description: 'Physical fitness and wellness programs including yoga and outdoor sports activities',
    thumbnail: '/yoga-sports.jpg',
    images: [{ src: '/yoga-sports.jpg', alt: 'Yoga and Sports Activities' }],
  },
  {
    id: 'vocational',
    title: 'Vocational Education',
    description: 'Skill-based education programs developing practical expertise and professional skills',
    thumbnail: '/vocational-education.jpg',
    images: [{ src: '/vocational-education.jpg', alt: 'Vocational Education and Skill Development' }],
  },
  {
    id: 'health',
    title: 'Health Awareness',
    description: 'Health awareness campaigns and wellness programs including blood checking drives',
    thumbnail: '/health-awareness.jpg',
    images: [{ src: '/health-awareness.jpg', alt: 'Health Awareness Activities' }],
  },
]

export default function ActivitiesSection() {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const activeData = activities.find((a) => a.id === selectedActivity)
  const images = activeData?.images ?? []

  const next = () => setCurrentIndex((p) => (p + 1) % images.length)
  const prev = () => setCurrentIndex((p) => (p - 1 + images.length) % images.length)

  const openActivity = (id: string) => {
    setSelectedActivity(id)
    setCurrentIndex(0)
  }

  return (
    <section id="activities" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute -bottom-32 -right-32 w-[450px] h-[450px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="section-label mb-5 inline-flex">Student Life</span>
          <h2 className="text-4xl md:text-5xl font-bold gradient-text font-display mb-3">
            School Activities
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 rounded-full" />
            <div className="h-1.5 w-8 rounded-full bg-accent" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 rounded-full" />
          </div>
        </div>

        {/* Activity Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {activities.map((act) => (
            <div
              key={act.id}
              className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-2xl hover:shadow-black/20 transition-all duration-400 cursor-pointer h-72 hover:-translate-y-1"
              onClick={() => openActivity(act.id)}
            >
              <Image
                src={act.thumbnail || '/placeholder.svg'}
                alt={act.title}
                fill
                className="object-cover group-hover:scale-108 transition-transform duration-500"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              {/* Hover tint */}
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <h3 className="text-white font-bold text-xl font-display group-hover:text-yellow-300 transition-colors duration-300">
                  {act.title}
                </h3>
                <p className="text-white/70 text-xs mt-1.5 leading-relaxed line-clamp-2">
                  {act.description}
                </p>
                <div className="flex items-center gap-1.5 mt-3 text-white/55 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Eye size={13} />
                  <span>Click to view</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────── */}
      {selectedActivity && activeData && (
        <div
          className="fixed inset-0 bg-black/92 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="relative w-full max-w-5xl flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedActivity(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
            >
              <X size={28} />
            </button>

            {/* Image */}
            <div className="relative w-full h-80 md:h-[500px] rounded-2xl overflow-hidden bg-black/50 border border-white/10">
              <Image
                src={images[currentIndex]?.src || '/placeholder.svg'}
                alt={images[currentIndex]?.alt || ''}
                fill
                className="object-contain"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/65 text-white p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/10"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/65 text-white p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/10"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>

            {/* Info */}
            <div className="mt-5 text-center">
              <h3 className="text-white text-2xl font-bold font-display mb-1.5">{activeData.title}</h3>
              <p className="text-white/65 text-sm">{activeData.description}</p>
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`rounded-full transition-all duration-200 ${
                        idx === currentIndex
                          ? 'bg-primary w-6 h-2'
                          : 'bg-white/30 w-2 h-2 hover:bg-white/55'
                      }`}
                    />
                  ))}
                  <span className="text-white/50 text-xs ml-3">
                    {currentIndex + 1} / {images.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
