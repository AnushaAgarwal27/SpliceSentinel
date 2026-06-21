import { motion } from 'framer-motion'

export default function NarrativeSummary({ summary }) {
  if (!summary) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="bg-card-dark rounded-2xl border border-teal-deep/30 p-8"
    >
      <h3 className="text-2xl font-bold text-text-off-white mb-4">
        Summary for clinician review:
      </h3>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-teal-deep/20 rounded-lg p-6 border-l-4 border-teal-deep"
      >
        <p className="text-text-off-white leading-relaxed text-lg">
          {summary}
        </p>
      </motion.div>

      <p className="text-xs text-text-warm-gray mt-4">
        Based on FAERS patient narratives
      </p>
    </motion.div>
  )
}
