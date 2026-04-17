'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ArrowRight, Users, BookOpen, Award, Home } from 'lucide-react'

const stats = [
  { icon: BookOpen, value: '6–12', label: 'Classes' },
  { icon: Users, value: '25+', label: 'Faculty' },
  { icon: Award, value: 'Govt.', label: 'Recognized' },
  { icon: Home, value: 'KGBV', label: 'Girls Hostel' },
]

export default function HeroSection() {
  const [cms, setCms] = useState<any>(null)
  
  useEffect(() => {
    fetch('/api/cms').then(r => r.json()).then(data => {
      if (data && data.content) setCms(data)
    }).catch(e => console.error("CMS failed to load"))
  }, [])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const headingStr = cms?.content?.heroHeading || 'Model School, Manvad'
  const subtitleStr = cms?.content?.heroSubtitle || 'Quality education for classes 6 to 12. Dedicated to academic excellence and student success.'


  return (
    <section className="w-full">

      {/* ── Mobile Layout ─────────────────────────────────────── */}
      <div className="md:hidden relative w-full min-h-[92svh] flex flex-col justify-end overflow-hidden pb-10">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/school-building.jpg"
            alt="Model School Building"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Rich glassy overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        </div>

        {/* Content */}
        <div className="relative z-10 px-5 pt-28 animate-fade-up">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-bold tracking-[0.12em] uppercase bg-white/10 backdrop-blur-md border border-white/20 text-white/95 mb-4 shadow-sm">
            🎓 Govt. Model School, Manvad
          </span>
          <h1 className="text-[2.5rem] leading-[1.05] font-bold text-white mb-3 font-display">
            {headingStr.includes(',') ? (
              <>
                {headingStr.split(',')[0]},
                <span
                  className="block mt-1"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {headingStr.split(',').slice(1).join(',')}
                </span>
              </>
            ) : (
              headingStr
            )}
          </h1>
          <p className="text-white/80 mb-6 text-sm leading-relaxed max-w-[280px]">
            {subtitleStr}
          </p>

          {/* Stats Carousel */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 mb-8 pb-3 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {stats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <div
                  key={i}
                  className="snap-center shrink-0 w-[110px] backdrop-blur-md bg-white/10 border border-white/15 rounded-2xl p-3.5 text-center shadow-lg"
                >
                  <Icon size={18} className="text-yellow-400 mx-auto mb-2" />
                  <div className="text-white font-bold text-lg leading-none font-display mb-1">
                    {stat.value}
                  </div>
                  <div className="text-white/60 text-[0.65rem] font-medium tracking-wider uppercase">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col xs:flex-row gap-3">
            <button
              onClick={() => scrollTo('contact')}
              className="btn-shimmer group flex items-center justify-center gap-2 w-full xs:w-auto px-6 py-3.5 rounded-full font-semibold text-sm text-white shadow-xl transition-all duration-300 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              Contact Us
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform duration-300"
              />
            </button>
            <button
              onClick={() => scrollTo('about')}
              className="w-full xs:w-auto px-6 py-3.5 rounded-full font-semibold text-sm border border-white/30 text-white hover:bg-white/10 transition-all duration-300 backdrop-blur-sm active:scale-[0.98]"
            >
              About Us
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop Layout ────────────────────────────────────── */}
      <div className="hidden md:block relative w-full h-screen overflow-hidden">

        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/school-building.jpg"
            alt="Model School Building"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Rich multi-layer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="absolute inset-0 bg-primary/18 mix-blend-multiply" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-8 lg:px-20">
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-2xl xl:max-w-3xl animate-fade-up">

              {/* Badge */}
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[0.7rem] font-bold tracking-[0.14em] uppercase bg-white/10 backdrop-blur-sm border border-white/20 text-white/90">
                  🎓 Government Model School, Manvad
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-6 font-display">
                {headingStr.includes(',') ? (
                  <>
                    {headingStr.split(',')[0]},
                    <span
                      className="block"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {headingStr.split(',').slice(1).join(',')}
                    </span>
                  </>
                ) : (
                  headingStr
                )}
              </h1>

              {/* Subheading */}
              <p className="text-lg lg:text-xl text-white/80 leading-relaxed mb-10 max-w-lg">
                {subtitleStr}
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => scrollTo('contact')}
                  className="btn-shimmer group relative overflow-hidden flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-sm text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                >
                  Contact Us
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                </button>
                <button
                  onClick={() => scrollTo('about')}
                  className="px-8 py-3.5 rounded-full font-semibold text-sm border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/55 transition-all duration-300 hover:-translate-y-0.5 backdrop-blur-sm"
                >
                  About Us
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Stat Cards — pushed to the right */}
        <div className="absolute bottom-10 right-8 lg:right-20">
          <div className="flex items-center gap-3 animate-fade-up animation-delay-300">
            {stats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <div
                  key={i}
                  className="min-w-[110px] backdrop-blur-md bg-white/10 border border-white/14 rounded-2xl p-4 text-center hover:bg-white/16 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <Icon
                    size={18}
                    className="text-yellow-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform"
                  />
                  <div className="text-white font-bold text-xl leading-none font-display">
                    {stat.value}
                  </div>
                  <div className="text-white/55 text-[0.68rem] mt-1 font-medium">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
