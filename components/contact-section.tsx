'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle2 } from 'lucide-react'

export default function ContactSection() {
  const router = useRouter()
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()


    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
      setFormData({ name: '', email: '', message: '' })
      setTimeout(() => setIsSubmitted(false), 4000)
    }, 800)
  }

  return (
    <section id="contact" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold gradient-text font-display mb-3">
            Contact Us
          </h2>
          <p className="text-foreground/60 max-w-lg mx-auto text-sm leading-relaxed mb-4">
            Have questions? Send us a message and we&apos;ll get back to you soon.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card border border-border/30 overflow-hidden shadow-2xl shadow-black/8">
          <div className="grid md:grid-cols-2">

            {/* ── Left: Form ─── */}
            <div className="p-8 md:p-10">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <input
                    type="text"
                    id="contact-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your Name"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-200"
                  />
                </div>

                {/* Email */}
                <div>
                  <input
                    type="email"
                    id="contact-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Email Address"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-200"
                  />
                </div>

                {/* Message */}
                <div>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Your Message"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-200 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-shimmer w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Sending...' : 'Send Message'}
                </button>

                {isSubmitted && (
                  <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/25 rounded-xl text-sm text-primary font-medium animate-fade-up">
                    <CheckCircle2 size={16} />
                    Message sent successfully.
                  </div>
                )}
              </form>
            </div>

            {/* ── Right: Info Panel ─── */}
            <div className="relative p-8 md:p-10 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground flex flex-col justify-center overflow-hidden">
              <div className="relative space-y-6">
                <div>
                  <h3 className="text-xl font-bold font-display mb-2">School Admissions</h3>
                  <p className="text-primary-foreground/80 leading-relaxed text-sm">
                    Inquiries for classes 6th to 12th are currently open. Contact us to schedule a visit or learn more about our curriculum.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Admissions & Enrollment',
                    'Curriculum & Subjects',
                    'Campus Visits',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      <p className="text-sm">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
