import { motion } from 'framer-motion'
import { Activity, ArrowRight, Database, Dna, FileSearch, ShieldCheck, Sparkles } from 'lucide-react'

const signalCards = [
  { label: 'FAERS reports', value: 'Real-world', icon: Database },
  { label: 'Signal scoring', value: 'PRR analysis', icon: Activity },
  { label: 'Clinical output', value: 'Review-ready', icon: FileSearch },
]

const workflow = [
  'Upload report',
  'Extract medications',
  'Map adverse signals',
  'Review clinical note',
]

function SignalRibbon() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[38%] h-80 overflow-hidden opacity-80">
      <svg viewBox="0 0 1440 360" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="goldLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#C9A35C" stopOpacity="0.12" />
            <stop offset="45%" stopColor="#C9A35C" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#C9A35C" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="tealLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#0F4C45" stopOpacity="0.16" />
            <stop offset="50%" stopColor="#7FA88C" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#0F4C45" stopOpacity="0.16" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((index) => (
          <motion.path
            key={index}
            d={`M 0 ${118 + index * 38} C 210 ${98 + index * 18}, 300 ${260 - index * 28}, 485 190 C 610 ${142 - index * 10}, 660 ${224 + index * 8}, 720 178 C 790 ${124 + index * 14}, 846 ${226 - index * 12}, 930 182 C 1100 ${94 + index * 20}, 1160 ${252 - index * 24}, 1440 ${128 + index * 36}`}
            fill="none"
            stroke={index % 2 === 0 ? 'url(#tealLine)' : 'url(#goldLine)'}
            strokeWidth={index % 2 === 0 ? 2 : 2.4}
            filter="url(#softGlow)"
            initial={{ pathLength: 0.3, opacity: 0.45 }}
            animate={{ pathLength: [0.35, 1, 0.35], opacity: [0.35, 0.95, 0.35] }}
            transition={{ duration: 8 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.5 }}
          />
        ))}
      </svg>
    </div>
  )
}

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-dark text-text-off-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(15,76,69,0.22),transparent_34%),radial-gradient(circle_at_12%_80%,rgba(201,163,92,0.10),transparent_28%),linear-gradient(180deg,#0A0A0B_0%,#101311_52%,#0A0A0B_100%)]" />
      <SignalRibbon />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-teal-deep/50 bg-teal-deep/20">
            <Dna size={23} className="text-[#7FA88C]" strokeWidth={1.7} />
          </div>
          <div>
            <p className="font-serif text-2xl leading-none tracking-wide text-text-off-white">Splice Sentinel</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-text-warm-gray">FDA FAERS signal review</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl items-center gap-12 px-6 pb-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-deep/40 bg-card-dark/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7FA88C]"
          >
            <Sparkles size={14} />
            Clinical pharmacovigilance workspace
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="font-serif text-[clamp(4.6rem,9vw,8.8rem)] font-light leading-[0.9] tracking-normal text-text-off-white"
          >
            Splice Sentinel
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-7 max-w-2xl text-xl leading-8 text-text-warm-gray"
          >
            Turn patient context and proposed prescriptions into a focused interaction review using real FDA adverse event reports.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-teal-deep px-7 py-4 text-base font-bold text-white shadow-xl shadow-teal-deep/20 transition hover:bg-teal-light"
            >
              Get Started
              <ArrowRight size={18} />
            </button>
            <div className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-deep/35 bg-card-dark/65 px-5 py-4 text-sm font-semibold text-text-warm-gray">
              <ShieldCheck size={18} className="text-[#7FA88C]" />
              Data source: FDA FAERS via openFDA
            </div>
          </motion.div>
        </section>

        <motion.aside
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="rounded-2xl border border-teal-deep/35 bg-card-dark/82 p-6 shadow-2xl shadow-bg-dark/40 backdrop-blur"
        >
          <div className="mb-6 flex items-center justify-between border-b border-teal-deep/25 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-warm-gray">Live review flow</p>
              <h2 className="mt-2 text-2xl font-bold text-text-off-white">From chart to signal map</h2>
            </div>
            <Activity size={28} className="text-gold-muted" />
          </div>

          <div className="space-y-3">
            {workflow.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border border-teal-deep/25 bg-bg-dark/45 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-teal-deep/25 text-sm font-bold text-[#7FA88C]">
                  {index + 1}
                </span>
                <span className="font-semibold text-text-off-white">{step}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {signalCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-gold-muted/20 bg-gold-muted/5 p-4">
                <Icon size={19} className="mb-3 text-gold-muted" />
                <p className="text-sm font-bold text-text-off-white">{value}</p>
                <p className="mt-1 text-xs text-text-warm-gray">{label}</p>
              </div>
            ))}
          </div>
        </motion.aside>
      </main>
    </div>
  )
}
