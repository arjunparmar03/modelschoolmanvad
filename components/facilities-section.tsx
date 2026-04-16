import { Microscope, Monitor, BookMarked, Trophy, Shield, Trees } from 'lucide-react'

const facilities = [
  {
    name: 'Science Laboratories',
    description: 'State-of-the-art labs equipped with modern equipment for hands-on practical learning.',
    icon: Microscope,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    borderDefault: 'border-primary/15',
    borderHover: 'hover:border-primary/40',
    shadowHover: 'hover:shadow-primary/8',
    bar: 'from-primary to-primary/60',
  },
  {
    name: 'Smart Classrooms',
    description: 'Technology-enabled teaching spaces with interactive learning tools and digital resources.',
    icon: Monitor,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    borderDefault: 'border-accent/15',
    borderHover: 'hover:border-accent/40',
    shadowHover: 'hover:shadow-accent/8',
    bar: 'from-accent to-accent/60',
  },
  {
    name: 'Library',
    description: 'Comprehensive collection of books and digital resources for research and self-learning.',
    icon: BookMarked,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    borderDefault: 'border-primary/15',
    borderHover: 'hover:border-primary/40',
    shadowHover: 'hover:shadow-primary/8',
    bar: 'from-primary to-accent',
  },
  {
    name: 'Sports & Activities',
    description: 'Comprehensive facilities for physical education, sports, and extracurricular activities.',
    icon: Trophy,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    borderDefault: 'border-accent/15',
    borderHover: 'hover:border-accent/40',
    shadowHover: 'hover:shadow-accent/8',
    bar: 'from-accent to-primary',
  },
  {
    name: 'Safe Campus',
    description: 'Secure and disciplined environment with proper supervision for every student.',
    icon: Shield,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    borderDefault: 'border-primary/15',
    borderHover: 'hover:border-primary/40',
    shadowHover: 'hover:shadow-primary/8',
    bar: 'from-primary to-primary/60',
  },
  {
    name: 'Green Campus',
    description: 'Eco-friendly environment with well-maintained gardens and lush green spaces.',
    icon: Trees,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    borderDefault: 'border-accent/15',
    borderHover: 'hover:border-accent/40',
    shadowHover: 'hover:shadow-accent/8',
    bar: 'from-accent to-accent/60',
  },
]

export default function FacilitiesSection() {
  return (
    <section id="facilities" className="py-20 md:py-28 relative overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="section-label mb-5 inline-flex">Infrastructure</span>
          <h2 className="text-4xl font-bold gradient-text font-display mb-3">
            Our Facilities
          </h2>
          <p className="text-foreground/60 max-w-lg mx-auto text-sm leading-relaxed">
            Modern infrastructure designed to support a comprehensive learning experience.
          </p>
        </div>

        {/* Facility Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((fac, i) => {
            const Icon = fac.icon
            return (
              <div
                key={i}
                className={`glass-card p-6 border ${fac.borderDefault} ${fac.borderHover} transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${fac.shadowHover} group cursor-default`}
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 ${fac.iconBg} rounded-2xl flex items-center justify-center mb-5 border ${fac.borderDefault} group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}
                >
                  <Icon className={fac.iconColor} size={28} />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-200 font-display">
                  {fac.name}
                </h3>
                <p className="text-foreground/60 text-sm leading-relaxed">
                  {fac.description}
                </p>

                {/* Bottom accent bar */}
                <div
                  className={`mt-5 h-0.5 w-0 bg-gradient-to-r ${fac.bar} group-hover:w-full transition-all duration-500 rounded-full`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
