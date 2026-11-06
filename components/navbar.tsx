'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/academics', label: 'Academics' },
  { href: '/campus', label: 'Campus Life' },
  { href: '/notices', label: 'Notices' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Floating Pill Navigation */}
      <div className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center pointer-events-none transition-all duration-500">
        <nav
          className={`pointer-events-auto flex items-center justify-between w-[93%] sm:w-[85%] max-w-5xl rounded-[2rem] glass border border-white/40 dark:border-white/10 transition-all duration-500 ${
            scrolled ? 'py-1.5 px-3.5 sm:px-4 shadow-xl shadow-black/5 scale-[0.98]' : 'py-2 px-3.5 sm:px-5 shadow-lg shadow-black/5 scale-100'
          }`}
        >

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10">
              <div className="absolute inset-0 rounded-full bg-primary/25 group-hover:bg-primary/40 blur-sm transition-all duration-300 scale-110" />
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-eMWi8OIdG1Jn65v02oIukibJx4s4UX.jpg"
                alt="Model School Logo"
                width={40}
                height={40}
                className="relative rounded-full w-full h-full object-cover ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all duration-300"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-primary text-[0.85rem] sm:text-[0.95rem] leading-none font-display whitespace-nowrap mb-0.5">
                Model School
              </span>
              <span className="text-muted-foreground text-[0.55rem] sm:text-[0.6rem] font-semibold tracking-[0.18em] uppercase">
                Manvad
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-foreground/75 hover:text-primary text-sm font-medium transition-colors duration-200 group"
              >
                {link.label}
                <span className="absolute bottom-1 left-4 right-4 h-px bg-primary rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </Link>
            ))}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/contact">
              <button className="btn-shimmer relative overflow-hidden px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5">
                Admissions
              </button>
            </Link>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl hover:bg-primary/10 text-foreground/80 hover:text-primary transition-all duration-200"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </div>

      {/* Fullscreen Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-2xl animate-fade-in flex flex-col justify-center items-center h-[100dvh]">
            <div className="w-full max-w-sm px-6 flex flex-col gap-6 items-center">
              {navLinks.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-2xl font-display font-medium text-foreground hover:text-primary transition-all duration-300 animate-fade-up"
                  style={{ animationDelay: `${(i + 1) * 75}ms` }}
                >
                  {link.label}
                </Link>
              ))}
              <div 
                className="w-full pt-6 mt-4 border-t border-border/50 flex justify-center animate-fade-up"
                style={{ animationDelay: `${(navLinks.length + 1) * 75}ms` }}
              >
                <Link href="/contact" onClick={() => setIsOpen(false)} className="w-full">
                  <button className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                    Admissions
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
    </>
  )
}
