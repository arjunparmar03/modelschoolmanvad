import { BookOpen, Beaker } from 'lucide-react'

const classes = [
  {
    number: '01',
    category: 'Primary Education',
    range: 'Classes 6th – 8th',
    description:
      'Foundation education with comprehensive curriculum covering Science, Mathematics, English, and Social Studies.',
    icon: BookOpen,
    headerGradient: 'from-primary/12 to-primary/4',
    accentBar: 'from-primary to-primary/60',
    sections: [
      { class: '6th Standard', divisions: '2 Divisions', capacity: '40 students / division', focus: 'NMMS & GYAANSADHNAA Exam' },
      { class: '7th Standard', divisions: '2 Divisions', capacity: '40 students / division', focus: 'NMMS & GYAANSADHNAA Exam' },
      { class: '8th Standard', divisions: '2 Divisions', capacity: '40 students / division', focus: 'NMMS & GYAANSADHNAA Exam' },
    ],
  },
  {
    number: '02',
    category: 'Secondary Education',
    range: 'Classes 9th – 10th',
    description:
      'Advanced curriculum preparing students for board examinations with emphasis on conceptual learning and practical skills.',
    icon: BookOpen,
    headerGradient: 'from-accent/12 to-accent/4',
    accentBar: 'from-accent to-accent/60',
    sections: [
      { class: '9th Standard', divisions: '2 Divisions', capacity: '60 students / division', focus: 'Board Exam Preparation' },
      { class: '10th Standard', divisions: '2 Divisions', capacity: '60 students / division', focus: 'Board Exam Preparation' },
    ],
  },
  {
    number: '03',
    category: 'Higher Secondary',
    range: 'Classes 11th & 12th',
    description:
      'Science stream specialization with advanced curriculum designed to prepare students for competitive exams like JEE and NEET.',
    icon: Beaker,
    headerGradient: 'from-primary/12 via-primary/6 to-accent/8',
    accentBar: 'from-primary to-accent',
    sections: [
      { class: '11th Standard', divisions: 'A Group & B Group', capacity: '60 students / division', focus: 'JEE & NEET Preparation' },
      { class: '12th Standard', divisions: 'A Group & B Group', capacity: '60 students / division', focus: 'JEE & NEET Preparation' },
    ],
  },
]

export default function ClassesSection() {
  return (
    <section id="classes" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-[450px] h-[450px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="section-label mb-5 inline-flex">Academic Programs</span>
          <h2 className="text-4xl font-bold gradient-text font-display mb-3">
            Academic Programs
          </h2>
          <p className="text-foreground/60 max-w-lg mx-auto text-sm leading-relaxed">
            Comprehensive curriculum for primary, secondary, and higher secondary levels.
          </p>
        </div>

        {/* Class Cards */}
        <div className="space-y-8">
          {classes.map((cls, i) => {
            const Icon = cls.icon
            return (
              <div
                key={i}
                className="glass-card border border-border/30 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden group"
              >
                {/* Card Header */}
                <div className={`bg-gradient-to-r ${cls.headerGradient} p-6 border-b border-border/25`}>
                  <div className="flex items-center gap-4">
                    {/* Decorative number */}
                    <span className="text-6xl font-bold text-foreground/6 font-display leading-none select-none">
                      {cls.number}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/15 group-hover:scale-105 transition-transform duration-300">
                        <Icon className="text-primary" size={26} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground font-display">
                          {cls.category}
                        </h3>
                        <p className="text-foreground/58 text-sm font-medium mt-0.5">{cls.range}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <p className="text-foreground/70 mb-6 leading-relaxed text-sm">{cls.description}</p>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cls.sections.map((sec, j) => (
                      <div
                        key={j}
                        className="bg-foreground/3 border border-border/40 rounded-xl p-4 hover:border-primary/25 hover:bg-primary/3 transition-all duration-200 group/card"
                      >
                        <h4 className="font-bold text-foreground text-base mb-3 font-display group-hover/card:text-primary transition-colors duration-200">
                          {sec.class}
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-foreground/45 min-w-[60px]">Divisions</span>
                            <span className="text-foreground/80 font-medium">{sec.divisions}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-foreground/45 min-w-[60px]">Capacity</span>
                            <span className="text-foreground/80 font-medium">{sec.capacity}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-foreground/45 min-w-[60px]">Focus</span>
                            <span className="text-primary font-semibold">{sec.focus}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom accent bar */}
                <div className={`h-0.5 w-0 bg-gradient-to-r ${cls.accentBar} group-hover:w-full transition-all duration-700 rounded-full`} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
