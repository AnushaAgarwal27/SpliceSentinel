import { motion } from 'framer-motion'
import GoogleGeminiEffectDemo from '@/components/ui/google-gemini-effect-demo'

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="bg-bg-dark w-full relative">
      <GoogleGeminiEffectDemo />

      {/* Get Started Button */}
      <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-40">
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 rounded px-8 py-3 text-base font-sans font-medium text-white shadow-xl hover:shadow-2xl transition-all border border-gold-muted/30 bg-teal-deep hover:bg-teal-light"
        >
          Get Started
          <span className="ml-1">→</span>
        </motion.button>
      </div>
    </div>
  )
}
