import { MapPin, Mail, Clock } from 'lucide-react'

const contactItems = [
  {
    icon: MapPin,
    title: 'Address',
    content: (
      <>
        Model School, Manvad
        <br />
        Manvad, India
      </>
    ),
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    borderColor: 'border-primary/15',
    hoverBorder: 'hover:border-primary/35',
    hoverShadow: 'hover:shadow-primary/6',
  },
  {
    icon: Mail,
    title: 'Email',
    content: 'modelmanvad@gmail.com',
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    borderColor: 'border-accent/15',
    hoverBorder: 'hover:border-accent/35',
    hoverShadow: 'hover:shadow-accent/6',
  },
  {
    icon: Clock,
    title: 'Working Hours',
    content: (
      <>
        Monday – Friday: 10:30 AM – 5:00 PM
        <br />
        Saturday: 7:30 AM – 11:30 AM
        <br />
        Sunday: Closed
      </>
    ),
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    borderColor: 'border-primary/15',
    hoverBorder: 'hover:border-primary/35',
    hoverShadow: 'hover:shadow-primary/6',
  },
]

export default function LocationSection() {
  return (
    <section id="location" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="section-label mb-5 inline-flex">Find Us</span>
          <h2 className="text-4xl md:text-5xl font-bold gradient-text font-display mb-3">
            Location & Contact Info
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 rounded-full" />
            <div className="h-1.5 w-8 rounded-full bg-accent" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 rounded-full" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">

          {/* Map */}
          <div className="overflow-hidden rounded-2xl shadow-xl shadow-black/10 border border-border/30 h-96 md:h-auto">
            <a
              href="https://maps.app.goo.gl/o1ktzZzK1AeucRPE9"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full h-full"
            >
              <iframe
                src="https://maps.google.com/maps?q=Model+School+Manvad&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '384px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Model School Location"
              />
            </a>
          </div>

          {/* Contact Info Cards */}
          <div className="space-y-4">
            {contactItems.map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={i}
                  className={`glass-card p-5 border ${item.borderColor} ${item.hoverBorder} hover:shadow-lg ${item.hoverShadow} hover:-translate-y-0.5 transition-all duration-300 group`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 ${item.iconBg} rounded-xl flex items-center justify-center border ${item.borderColor} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className={item.iconColor} size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1 font-display text-sm tracking-wide">
                        {item.title}
                      </h3>
                      <p className="text-foreground/65 text-sm leading-relaxed">
                        {item.content}
                      </p>
                    </div>
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
