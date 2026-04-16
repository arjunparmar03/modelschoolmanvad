'use client'

import Image from 'next/image'
import { ArrowRight, Users, BookOpen, Award, Home } from 'lucide-react'

const stats = [
  { icon: BookOpen, value: '6–12', label: 'Classes' },
  { icon: Users, value: '25+', label: 'Faculty' },
  { icon: Award, value: 'Govt.', label: 'Recognized' },
  { icon: Home, value: 'KGBV', label: 'Girls Hostel' },
]

export default function HeroSection() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="w-full">

      {/* ── Mobile Layout ─────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Image */}
        <div className="relative w-full h-64">
          <Image
            src="/school-building.jpg"
            alt="Model School Building"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        </div>

        {/* Text panel */}
        <div className="relative px-5 py-10 text-center bg-gradient-to-b from-primary to-primary/95">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.65rem] font-bold tracking-widest uppercase bg-white/12 border border-white/18 text-white/90 mb-5">
            🎓 Government Model School
          </span>
          <h1
            className="text-3xl font-bold text-white mb-3 leading-[1.15] font-display"
          >
            Model School, <span style={{ color: '#fbbf24' }}>Manvad</span>
          </h1>
          <p className="text-white/78 mb-7 text-sm leading-relaxed max-w-xs mx-auto">
            Quality education for classes 6 to 12.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => scrollTo('contact')}
              className="btn-shimmer w-full max-w-xs px-6 py-3 rounded-full font-semibold text-sm text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              Contact Us
            </button>
            <button
              onClick={() => scrollTo('about')}
              className="w-full max-w-xs px-6 py-3 rounded-full border border-white/30 text-white font-medium text-sm hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
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
                Model School,
                <span
                  className="block"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Manvad
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-lg lg:text-xl text-white/80 leading-relaxed mb-10 max-w-lg">
                Quality education for classes 6 to 12. Dedicated to academic excellence and student success.
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
