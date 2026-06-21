import { motion } from 'framer-motion'

export function AnalysisHeader({ results }) {
  if (!results) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 p-8"
    >
      <h2 className="text-3xl font-bold text-white mb-2">
        Analysis: {results.drug_a} + {results.drug_b}
      </h2>
      <p className="text-slate-400">FDA FAERS adverse event data</p>
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
      className="rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8"
    >
      <h3 className="text-2xl font-bold text-white mb-6">Summary Statistics</h3>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/30 rounded-lg p-4 border border-indigo-500/30 hover:border-indigo-500/60 transition">
          <div className="text-3xl font-bold text-indigo-400">{results.combo_total.toLocaleString()}</div>
          <p className="text-xs text-slate-400 mt-1">Total Reports</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-lg p-4 border border-blue-500/30 hover:border-blue-500/60 transition">
          <div className="text-3xl font-bold text-blue-400">{signals.length}</div>
          <p className="text-xs text-slate-400 mt-1">Reactions</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/30 to-slate-900/30 rounded-lg p-4 border border-cyan-500/30 hover:border-cyan-500/60 transition">
          <div className="text-3xl font-bold text-cyan-400">{elevatedSignals.length}</div>
          <p className="text-xs text-slate-400 mt-1">High Risk (PRR≥2)</p>
        </div>
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-slate-600 transition">
          <div className="text-3xl font-bold text-slate-300">
            {signals.length > 0 ? (results.combo_total / signals.length).toFixed(1) : '0'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Avg/Reaction</p>
        </div>
      </div>
    </motion.div>
  )
}

export function ReactionsTable({ results }) {
  if (!results) return null

  const signals = results.signals || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8"
    >
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-white">Most Frequent Adverse Reactions (Across All Cases)</h3>
        <p className="text-xs text-slate-400 mt-1">Reactions ranked by frequency and statistical signal strength (PRR)</p>
      </div>
      <div className="overflow-x-auto overflow-y-auto max-h-96 border border-slate-700 rounded-lg">
        <table className="w-full text-xs text-slate-300">
          <thead className="border-b border-slate-700 sticky top-0 bg-slate-900/80">
            <tr className="text-left text-slate-200">
              <th className="pb-2 px-2 py-2">Reaction</th>
              <th className="pb-2 px-2 text-right">Reports</th>
              <th className="pb-2 px-2 text-right">% Total</th>
              <th className="pb-2 px-2 text-right">PRR-A</th>
              <th className="pb-2 px-2 text-right">PRR-B</th>
              <th className="pb-2 px-2 text-right">Max PRR</th>
              <th className="pb-2 px-2 text-right">Signal</th>
            </tr>
          </thead>
          <tbody>
            {signals.slice(0, 50).map((sig, i) => {
              const maxPRR = Math.max(sig.prr_vs_drug_a, sig.prr_vs_drug_b)
              const isElevated = maxPRR >= 2
              return (
                <tr key={i} className={`border-b border-slate-700/50 hover:bg-indigo-900/10 transition ${isElevated ? 'bg-indigo-900/20' : ''}`}>
                  <td className="py-2 px-2">{i + 1}. {sig.reaction}</td>
                  <td className="py-2 px-2 text-right font-semibold">{sig.combo_count}</td>
                  <td className="py-2 px-2 text-right">{((sig.combo_count / results.combo_total) * 100).toFixed(2)}%</td>
                  <td className="py-2 px-2 text-right">{sig.prr_vs_drug_a.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{sig.prr_vs_drug_b.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-bold" style={{ color: isElevated ? '#4fb3ff' : '#94a3b8' }}>
                    {maxPRR.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right">{isElevated ? '🚨' : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
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
          className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-8 mt-8"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">📊</div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Insufficient Data</h3>
              <p className="text-slate-300 text-sm">
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
        <ReactionsTable results={results} />
      </div>
    )
  } catch (err) {
    console.error('AnalysisSummary rendering error:', err)
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-8">
        <p className="font-bold">Error rendering results</p>
        <p className="text-sm">{err.message}</p>
      </div>
    )
  }
}
