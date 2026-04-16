'use client'

import { Users, Award, BookOpen, Microscope } from 'lucide-react'

const qualities = [
  {
    title: 'Qualified & Certified',
    description: 'All faculty members hold relevant degrees and certifications',
    dot: 'bg-primary',
  },
  {
    title: 'Experienced Mentors',
    description: 'Average 10+ years of teaching experience in their fields',
    dot: 'bg-accent',
  },
  {
    title: 'Student-Focused',
    description: 'Dedicated to individual student development and attention',
    dot: 'bg-primary',
  },
  {
    title: 'Continuous Learning',
    description: 'Regular training and professional development programs',
    dot: 'bg-accent',
  },
]

const grades = [
  {
    name: 'Middle School (6-8)',
    icon: BookOpen,
    description:
      'Comprehensive faculty teaching foundational subjects with focus on building strong conceptual base and co-curricular activities.',
    members: '8+ Teachers',
    subjects: [
      'Mathematics', 'Science', 'Social Science',
      'Hindi', 'Gujarati', 'Physical Education', 'English', 'Sanskrit',
    ],
    highlights: 'Foundational learning with personality development',
    topBar: 'from-primary to-primary/60',
    iconBg: 'bg-primary/10',
    subjectBg: 'bg-primary/8 border-primary/18 text-primary',
  },
  {
    name: 'Upper School (9-10)',
    icon: Award,
    description:
      'Specialized faculty focusing on board-level curriculum with emphasis on concept building and skill development.',
    members: '8+ Teachers',
    subjects: [
      'Mathematics', 'Science', 'Social Science',
      'Hindi', 'Gujarati', 'English', 'Electrical & Hardware', 'I.T. and ITeS', 'Physical Education',
    ],
    highlights: 'Board exam preparation and skill enhancement',
    topBar: 'from-accent to-accent/60',
    iconBg: 'bg-accent/10',
    subjectBg: 'bg-accent/8 border-accent/18 text-accent',
  },
  {
    name: '11-12 Science Stream',
    icon: Microscope,
    description:
      'Expert faculty with advanced qualifications specializing in science stream education with emphasis on practical knowledge.',
    members: '8+ Teachers',
    subjects: [
      'Mathematics', 'Chemistry', 'Physics', 'Biology', 'English', 'Sanskrit',
    ],
    highlights: 'Research-oriented learning for competitive exams',
    topBar: 'from-primary via-primary/80 to-accent',
    iconBg: 'bg-gradient-to-br from-primary/10 to-accent/10',
    subjectBg: 'bg-primary/8 border-primary/18 text-primary',
  },
]

export default function FacultySection() {
  return (
    <section id="faculty" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[480px] h-[480px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* ── Section Header ─── */}
        <div className="text-center mb-16">
          <span className="section-label mb-5 inline-flex">Meet the Team</span>
          <h2 className="text-4xl md:text-5xl font-bold gradient-text font-display mb-3">
            Our Faculty
          </h2>
          <p className="text-foreground/60 max-w-2xl mx-auto text-sm leading-relaxed mb-5">
            Dedicated educators committed to inspiring excellence and nurturing young minds
            through quality instruction and mentorship.
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 rounded-full" />
            <div className="h-1.5 w-8 rounded-full bg-accent" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 rounded-full" />
          </div>
        </div>

        {/* ── Quality Grid ─── */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 mb-16">
          {qualities.map((q, i) => (
            <div
              key={i}
              className="glass-card p-6 text-center border border-border/30 hover:border-primary/28 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/12 to-accent/12 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className={`w-2.5 h-2.5 rounded-full ${q.dot}`} />
              </div>
              <h3 className="text-[0.88rem] font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors font-display">
                {q.title}
              </h3>
              <p className="text-foreground/58 text-xs leading-relaxed">{q.description}</p>
            </div>
          ))}
        </div>

        {/* ── Grade Cards ─── */}
        <div>
          <h3 className="text-2xl font-bold text-center mb-8 gradient-text font-display">
            Faculty by Grade Level
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {grades.map((grade, i) => {
              const Icon = grade.icon
              return (
                <div
                  key={i}
                  className="glass-card border border-border/30 hover:border-primary/22 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-2 transition-all duration-300 overflow-hidden flex flex-col group"
                >
                  {/* Top gradient bar */}
                  <div className={`h-1 bg-gradient-to-r ${grade.topBar}`} />

                  <div className="p-6 flex flex-col flex-1">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`${grade.iconBg} p-3 rounded-xl border border-border/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                        <Icon className="text-primary" size={22} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground font-display leading-tight">
                          {grade.name}
                        </h4>
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5 tracking-wide">
                          {grade.members}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-foreground/68 mb-4 leading-relaxed text-sm">
                      {grade.description}
                    </p>

                    {/* Subjects */}
                    <div className="mb-4">
                      <p className="text-[0.65rem] font-bold text-foreground/50 uppercase tracking-[0.14em] mb-2.5">
                        Subjects Taught
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {grade.subjects.map((subject, j) => (
                          <span
                            key={j}
                            className={`border text-[0.7rem] font-medium px-2.5 py-0.5 rounded-full ${grade.subjectBg} hover:opacity-80 transition-opacity`}
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Highlight */}
                    <div className="mt-auto pt-4 border-t border-border/30">
                      <p className="text-xs font-semibold text-accent">{grade.highlights}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── CTA Banner ─── */}
        <div className="mt-14 glass-card border border-primary/18 p-10 text-center bg-gradient-to-br from-primary/5 to-accent/5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <h3 className="text-2xl font-bold gradient-text mb-3 font-display">
              Experienced Educators
            </h3>
            <p className="text-foreground/68 mb-6 max-w-2xl mx-auto text-sm leading-relaxed">
              Our faculty members are dedicated to helping every student reach their potential.
            </p>
            <a
              href="/contact"
              className="btn-shimmer inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300"
            >
              Get in Touch
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
