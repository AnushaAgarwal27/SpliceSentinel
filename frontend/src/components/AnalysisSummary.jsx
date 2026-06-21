import { motion } from 'framer-motion'

export default function AnalysisSummary({ results }) {
  if (!results) return null

  try {
    const signals = results.signals || []
    const elevatedSignals = signals.filter(s => Math.max(s.prr_vs_drug_a, s.prr_vs_drug_b) >= 2)

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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 p-8"
      >
        <h2 className="text-3xl font-bold text-white mb-2">
          Analysis: {results.drug_a} + {results.drug_b}
        </h2>
        <p className="text-slate-300">FDA adverse event data analysis</p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm border border-slate-600/50 p-8"
      >
        <h3 className="text-2xl font-bold text-white mb-6">Summary Statistics</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-500/30">
            <div className="text-3xl font-bold text-indigo-400">{results.combo_total.toLocaleString()}</div>
            <p className="text-xs text-slate-300 mt-1">Total Reports</p>
          </div>
          <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
            <div className="text-3xl font-bold text-purple-400">{signals.length}</div>
            <p className="text-xs text-slate-300 mt-1">Reactions</p>
          </div>
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
            <div className="text-3xl font-bold text-red-400">{elevatedSignals.length}</div>
            <p className="text-xs text-slate-300 mt-1">High Risk (PRR≥2)</p>
          </div>
          <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-500/30">
            <div className="text-3xl font-bold text-orange-400">
              {signals.length > 0 ? (results.combo_total / signals.length).toFixed(1) : '0'}
            </div>
            <p className="text-xs text-slate-300 mt-1">Avg/Reaction</p>
          </div>
        </div>
      </motion.div>

      {/* All Reactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm border border-slate-600/50 p-8"
      >
        <h3 className="text-2xl font-bold text-white mb-4">All Reactions (Top 50)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-300">
            <thead className="border-b border-slate-600">
              <tr className="text-left text-slate-200">
                <th className="pb-2 px-2">Reaction</th>
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
                  <tr key={i} className={`border-b border-slate-700 ${isElevated ? 'bg-red-900/10' : ''}`}>
                    <td className="py-1 px-2">{i + 1}. {sig.reaction}</td>
                    <td className="py-1 px-2 text-right font-semibold">{sig.combo_count}</td>
                    <td className="py-1 px-2 text-right">{((sig.combo_count / results.combo_total) * 100).toFixed(2)}%</td>
                    <td className="py-1 px-2 text-right">{sig.prr_vs_drug_a.toFixed(2)}</td>
                    <td className="py-1 px-2 text-right">{sig.prr_vs_drug_b.toFixed(2)}</td>
                    <td className="py-1 px-2 text-right font-bold" style={{ color: isElevated ? '#ef4444' : '#94a3b8' }}>
                      {maxPRR.toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-right">{isElevated ? '🚨' : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* High Risk Alert */}
      {elevatedSignals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-red-900/20 border border-red-500/50 p-8"
        >
          <div className="flex gap-4">
            <div className="text-4xl">🚨</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-300 mb-3">
                {elevatedSignals.length} High Risk Signal{elevatedSignals.length !== 1 ? 's' : ''} (PRR ≥ 2.0)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {elevatedSignals.map((sig, i) => {
                  const maxPRR = Math.max(sig.prr_vs_drug_a, sig.prr_vs_drug_b)
                  return (
                    <div key={i} className="bg-red-900/30 border border-red-700 rounded p-2 text-sm">
                      <div className="font-bold text-red-200">{sig.reaction}</div>
                      <div className="text-xs text-red-300">
                        {sig.combo_count} reports • {((sig.combo_count / results.combo_total) * 100).toFixed(2)}% • PRR: {maxPRR.toFixed(2)}× (A: {sig.prr_vs_drug_a.toFixed(2)}, B: {sig.prr_vs_drug_b.toFixed(2)})
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
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
