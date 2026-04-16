import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Facebook, Youtube, Mail, MapPin, Clock } from 'lucide-react'

const quickLinks = [
  { href: '/academics', label: 'Academic Programs' },
  { href: '/campus', label: 'Campus Tours' },
  { href: '/contact', label: 'Admissions' },
]

const socialLinks = [
  {
    href: 'https://www.instagram.com/modelschoolmanvad?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    icon: Instagram,
    label: 'Instagram',
  },
  {
    href: 'https://www.facebook.com/share/1DCXyUYWQj/',
    icon: Facebook,
    label: 'Facebook',
  },
  {
    href: 'https://youtube.com/@modelschoolmanvad',
    icon: Youtube,
    label: 'YouTube',
  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-primary/95 to-primary text-primary-foreground">
      {/* Gradient top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

      {/* Ambient glow blobs */}
      <div className="absolute top-0 -left-20 w-72 h-72 bg-white/4 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-72 h-72 bg-accent/12 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-18">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* ── Logo & About ─── */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 relative ring-2 ring-white/20 rounded-full">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-eMWi8OIdG1Jn65v02oIukibJx4s4UX.jpg"
                  alt="Model School Logo"
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              </div>
              <div>
                <span className="font-bold text-base leading-tight block font-display">
                  Model School
                </span>
                <span className="text-primary-foreground/55 text-[0.6rem] font-semibold tracking-[0.18em] uppercase">
                  Manvad
                </span>
              </div>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-5">
              Providing quality education for classes 6 to 12. Committed to student excellence and character development.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-2">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/12 hover:border-white/25 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:-translate-y-0.5"
                >
                  <Icon size={15} />
                </Link>
              ))}
            </div>
          </div>

          {/* ── Quick Links ─── */}
          <div>
            <h4 className="font-bold text-sm mb-5 tracking-wide font-display">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              {quickLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-primary-foreground/68 hover:text-primary-foreground transition-colors duration-200 flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
              {socialLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-foreground/68 hover:text-primary-foreground transition-colors duration-200 flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ─── */}
          <div>
            <h4 className="font-bold text-sm mb-5 tracking-wide font-display">Contact</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/68">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 flex-shrink-0 text-accent" />
                <span>Manvad, India</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail size={14} className="mt-0.5 flex-shrink-0 text-accent" />
                <span>modelmanvad@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* ── Hours ─── */}
          <div>
            <h4 className="font-bold text-sm mb-5 tracking-wide font-display">School Hours</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/68">
              <li className="flex items-center gap-2">
                <Clock size={13} className="text-accent flex-shrink-0" />
                <span className="font-medium text-primary-foreground/85">Mon – Fri</span>
              </li>
              <li className="pl-5">10:30 AM – 5:00 PM</li>
              <li className="flex items-center gap-2 pt-1">
                <Clock size={13} className="text-accent flex-shrink-0" />
                <span className="font-medium text-primary-foreground/85">Saturday</span>
              </li>
              <li className="pl-5">7:30 AM – 11:30 AM</li>
              <li className="flex items-center gap-2 pt-1">
                <Clock size={13} className="text-accent flex-shrink-0" />
                <span className="font-medium text-primary-foreground/85">Sunday</span>
              </li>
              <li className="pl-5">Closed</li>
            </ul>
          </div>
        </div>

        {/* ── Bottom Bar ─── */}
        <div className="border-t border-primary-foreground/12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/50">
            <p>© {year} Model School, Manvad. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="#" className="hover:text-primary-foreground/80 transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-primary-foreground/80 transition-colors duration-200">
                Terms & Conditions
              </Link>
              <Link href="/contact" className="hover:text-primary-foreground/80 transition-colors duration-200">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
