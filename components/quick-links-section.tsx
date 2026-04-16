import Link from 'next/link'
import { BookOpen, Building2, PhoneCall, ArrowRight } from 'lucide-react'

const links = [
  {
    title: 'Academics & Faculty',
    description:
      'Explore our curriculum, science streams, and meet the expert teachers dedicated to your child\'s success.',
    href: '/academics',
    icon: BookOpen,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    borderHover: 'hover:border-primary/35',
    shadowHover: 'hover:shadow-primary/8',
    barGradient: 'from-primary to-primary/70',
  },
  {
    title: 'Campus Life',
    description:
      'Discover our world-class facilities, vibrant daily activities, and an inspiring photo gallery.',
    href: '/campus',
    icon: Building2,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    borderHover: 'hover:border-accent/35',
    shadowHover: 'hover:shadow-accent/8',
    barGradient: 'from-accent to-accent/70',
  },
  {
    title: 'Contact & Admissions',
    description:
      'Ready to join? Find our location, reach our admissions team, and take the first step today.',
    href: '/contact',
    icon: PhoneCall,
    iconBg: 'bg-gradient-to-br from-primary/10 to-accent/10',
    iconColor: 'text-primary',
    borderHover: 'hover:border-primary/35',
    shadowHover: 'hover:shadow-primary/8',
    barGradient: 'from-primary to-accent',
  },
]

export default function QuickLinksSection() {
  return (
    <section className="py-16 md:py-24 mb-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="section-label mb-5 inline-flex">Explore the School</span>
          <h2 className="text-3xl md:text-5xl font-bold gradient-text font-display">
            Explore Model School
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 rounded-full" />
            <div className="h-1.5 w-8 rounded-full bg-accent" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 rounded-full" />
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {links.map((link, i) => {
            const Icon = link.icon
            return (
              <Link href={link.href} key={i} className="group block h-full">
                <div
                  className={`glass-card h-full p-7 border border-border/40 ${link.borderHover} transition-all duration-300 hover:shadow-xl ${link.shadowHover} hover:-translate-y-2 flex flex-col`}
                >
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-2xl ${link.iconBg} flex items-center justify-center mb-6 border border-border/30 group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}
                  >
                    <Icon className={link.iconColor} size={26} />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-200 font-display">
                    {link.title}
                  </h3>

                  {/* Description */}
                  <p className="text-foreground/60 text-sm leading-relaxed mb-6 flex-1">
                    {link.description}
                  </p>

                  {/* CTA Arrow */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary/70 group-hover:text-primary transition-colors duration-200">
                    <span>Explore deeper</span>
                    <ArrowRight
                      size={15}
                      className="group-hover:translate-x-1.5 transition-transform duration-300"
                    />
                  </div>

                  {/* Bottom gradient bar */}
                  <div
                    className={`mt-5 h-0.5 w-0 bg-gradient-to-r ${link.barGradient} group-hover:w-full transition-all duration-500 rounded-full`}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
