import { motion } from 'framer-motion'
import ReactionsNetworkGraph from './ReactionsNetworkGraph'

export function AnalysisHeader({ results }) {
  if (!results) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card-dark border border-teal-deep/30 p-8"
    >
      <h2 className="text-3xl font-serif font-light text-text-off-white mb-2">
        Analysis: {results.drug_a} + {results.drug_b}
      </h2>
      <p className="text-text-warm-gray font-sans">FDA FAERS adverse event data</p>
    </motion.div>
  )
}

export function SummaryStats({ results }) {
  if (!results) return null

  const signals = results.signals || []
  const elevatedSignals = signals.filter(s => Math.max(s.prr_vs_drug_a, s.prr_vs_drug_b) >= 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl bg-card-dark backdrop-blur-sm border border-teal-deep/30 p-8"
    >
      <h3 className="text-2xl font-bold text-text-off-white mb-6">Summary Statistics</h3>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-teal-deep/30 to-teal-deep/20 rounded-lg p-4 border border-teal-deep/50 hover:border-teal-deep transition">
          <div className="text-3xl font-bold text-teal-light">{results.combo_total.toLocaleString()}</div>
          <p className="text-xs text-text-warm-gray mt-1">Total Reports</p>
        </div>
        <div className="bg-gradient-to-br from-teal-deep/25 to-teal-deep/15 rounded-lg p-4 border border-teal-deep/50 hover:border-teal-deep transition">
          <div className="text-3xl font-bold text-teal-light">{signals.length}</div>
          <p className="text-xs text-text-warm-gray mt-1">Reactions</p>
        </div>
        <div className="bg-gradient-to-br from-gold-muted/20 to-gold-muted/10 rounded-lg p-4 border border-gold-muted/50 hover:border-gold-muted transition">
          <div className="text-3xl font-bold text-gold-muted">{elevatedSignals.length}</div>
          <p className="text-xs text-text-warm-gray mt-1">High Risk (PRR≥2)</p>
        </div>
        <div className="bg-gradient-to-br from-gold-muted/20 to-gold-muted/10 rounded-lg p-4 border border-gold-muted/50 hover:border-gold-muted transition">
          <div className="text-3xl font-bold text-gold-muted">
            {signals.length > 0 ? (results.combo_total / signals.length).toFixed(1) : '0'}
          </div>
          <p className="text-xs text-text-warm-gray mt-1">Avg/Reaction</p>
        </div>
      </div>
    </motion.div>
  )
}

export function ReactionsTable({ results }) {
  return <ReactionsNetworkGraph results={results} />
}

export default function AnalysisSummary({ results }) {
  if (!results) return null

  try {
    if (results.combo_total < 10) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="rounded-2xl bg-card-dark border border-teal-deep/30 p-8 mt-8"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">📊</div>
            <div>
              <h3 className="text-lg font-bold text-text-off-white mb-1">Insufficient Data</h3>
              <p className="text-text-warm-gray text-sm">
                Only {results.combo_total} reports found. Need at least 10 for analysis.
              </p>
            </div>
          </div>
        </motion.div>
      )
    }

    return (
      <div className="space-y-8">
        <AnalysisHeader results={results} />
        <SummaryStats results={results} />
        <ReactionsNetworkGraph results={results} />
      </div>
    )
  } catch (err) {
    console.error('AnalysisSummary rendering error:', err)
    return (
      <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded mt-8">
        <p className="font-bold">Error rendering results</p>
        <p className="text-sm">{err.message}</p>
      </div>
    )
  }
}
