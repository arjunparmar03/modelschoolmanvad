'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react'



export default function GallerySection() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayCategories, setDisplayCategories] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/cms').then(r => r.json()).then(data => {
      if (data?.galleryCategories?.length) {
        setDisplayCategories(data.galleryCategories)
      }
    }).catch(e => console.log(e))
  }, [])

  const activeData = displayCategories.find((c) => c.id === selectedCategory)
  const images = activeData?.images ?? []

  const next = () => setCurrentIndex((p) => (p + 1) % images.length)
  const prev = () => setCurrentIndex((p) => (p - 1 + images.length) % images.length)

  const openCategory = (id: string) => {
    setSelectedCategory(id)
    setCurrentIndex(0)
  }

  return (
    <section id="gallery" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-[450px] h-[450px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="section-label mb-5 inline-flex">Campus in Pictures</span>
          <h2 className="text-4xl md:text-5xl font-bold gradient-text font-display mb-3">
            Photo Gallery
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 rounded-full" />
            <div className="h-1.5 w-8 rounded-full bg-accent" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 rounded-full" />
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {displayCategories.map((cat) => (
            <div
              key={cat.id}
              className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-2xl hover:shadow-black/20 transition-all duration-400 cursor-pointer h-56 hover:-translate-y-1"
              onClick={() => openCategory(cat.id)}
            >
              <Image
                src={cat.thumbnail || '/placeholder.svg'}
                alt={cat.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Hover tint */}
              <div className="absolute inset-0 bg-primary/18 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <h3 className="text-white font-semibold text-base font-display group-hover:text-yellow-300 transition-colors duration-300">
                  {cat.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5 text-white/55 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Images size={12} />
                  <span>
                    {cat.images.length} image{cat.images.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Count badge (top-right) */}
              {cat.images.length > 1 && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/15 text-white text-[0.65rem] font-semibold">
                  {cat.images.length} photos
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────── */}
      {selectedCategory && activeData && (
        <div
          className="fixed inset-0 bg-black/93 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedCategory(null)}
        >
          <div
            className="relative w-full max-w-5xl flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedCategory(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
            >
              <X size={28} />
            </button>

            {/* Image container */}
            <div className="relative w-full h-72 md:h-[500px] rounded-2xl overflow-hidden bg-black/50 border border-white/10">
              <Image
                src={images[currentIndex]?.src || '/placeholder.svg'}
                alt={images[currentIndex]?.alt || 'Gallery image'}
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

            {/* Info + dots */}
            <div className="mt-5 text-center">
              <h3 className="text-white text-xl font-bold font-display mb-1.5">{activeData.title}</h3>
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
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
