import { CheckCircle2 } from 'lucide-react'

const highlights = [
  'Fully Government School',
  'KGBV Hostel Facility for Girls',
  'Discipline & Values-Based Learning',
  'Experienced Faculty Members',
  'Science-Focused Curriculum',
]

const stats = [
  { value: '6–12', label: 'Classes Offered' },
  { value: '500+', label: 'Students Enrolled' },
  { value: '25+', label: 'Expert Teachers' },
  { value: '100%', label: 'Government Funded' },
]

export default function AboutSection() {
  return (
    <section id="about" className="py-20 md:py-28 relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-accent/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="section-label mb-5 inline-flex">About Our School</span>
          <h2 className="text-4xl md:text-5xl font-bold gradient-text font-display mb-3">
            About Us
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 rounded-full" />
            <div className="h-1.5 w-8 rounded-full bg-accent" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 rounded-full" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ── Left: Text Content ─── */}
          <div>
            <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-5 leading-snug font-display">
              About <span className="gradient-text">Model School</span>
            </h3>

            <p className="text-foreground/75 leading-relaxed mb-6">
              Model School Manvad is a government institution providing quality education and character development. We offer a disciplined learning environment and hostel facilities for girl students.
            </p>

            <div className="space-y-3">
              {highlights.map((item, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/14 flex items-center justify-center group-hover:bg-accent/25 transition-colors duration-200">
                    <CheckCircle2 className="text-accent" size={14} />
                  </div>
                  <span className="text-foreground/82 font-medium text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Stats Grid ─── */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="glass-card p-6 border border-border/30 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/6 hover:-translate-y-1.5 transition-all duration-300 group cursor-default"
              >
                <div className="text-4xl lg:text-5xl font-bold gradient-text leading-none mb-2 font-display">
                  {stat.value}
                </div>
                <p className="text-foreground/60 text-sm font-medium">{stat.label}</p>
                <div className="mt-3 h-0.5 w-0 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-500 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
