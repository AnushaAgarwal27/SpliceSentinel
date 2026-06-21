import { motion } from 'framer-motion'

export default function SimilarCases({ cases, signals, combo_total, drug_a, drug_b }) {
  if (!cases || cases.length === 0) return null

  const topSignal = signals?.[0]
  const avgSimilarity = cases.length > 0
    ? Math.round(cases.reduce((sum, c) => sum + c.similarity_score, 0) / cases.length)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="bg-white rounded-xl shadow-lg p-8"
    >
      <h3 className="text-2xl font-bold text-slate-800 mb-8">
        👥 Similar Patient Cases in FDA Data
      </h3>

      {/* Statistical Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-6 bg-slate-50 rounded-lg"
      >
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">FDA Reports</p>
          <p className="text-2xl font-bold text-slate-800">{combo_total || 0}</p>
          <p className="text-xs text-slate-600">{drug_a} + {drug_b}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Flagged Reaction</p>
          <p className="text-lg font-bold text-danger">{topSignal?.reaction.split(' ')[0] || 'N/A'}</p>
          <p className="text-xs text-slate-600">{topSignal?.prr_vs_drug_a?.toFixed(1)}× higher risk</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Similar Cases Found</p>
          <p className="text-2xl font-bold text-primary">{cases.length}</p>
          <p className="text-xs text-slate-600">matched profiles</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Avg. Similarity</p>
          <p className="text-2xl font-bold text-success">{avgSimilarity}%</p>
          <p className="text-xs text-slate-600">to your patient</p>
        </div>
      </motion.div>

      <p className="text-slate-600 mb-6">
        Real patients with profiles similar to yours who took this drug combination and reported adverse events:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cases.map((caseData, index) => (
          <motion.div
            key={caseData.safetyreportid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
            className="border-2 border-slate-200 rounded-lg p-6 hover:border-primary hover:shadow-md transition"
          >
            {/* Similarity Score */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-600">Similarity Match</span>
                <span className={`text-2xl font-bold ${
                  caseData.similarity_score >= 70 ? 'text-success' :
                  caseData.similarity_score >= 50 ? 'text-warning' :
                  'text-slate-600'
                }`}>
                  {caseData.similarity_score}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${caseData.similarity_score}%` }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
                />
              </div>
            </div>

            {/* Why Similar */}
            <div className="mb-4 p-3 bg-slate-50 rounded">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Why similar:</span> {caseData.reason}
              </p>
            </div>

            {/* What Happened */}
            <div className="mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                What Happened
              </p>
              <p className="text-lg font-semibold text-danger">
                {caseData.reaction}
              </p>
            </div>

            {/* Timing */}
            {caseData.days_to_onset && (
              <div className="mb-3 text-sm text-slate-600">
                ⏱️ Onset: Day {caseData.days_to_onset}
              </div>
            )}

            {/* Report ID */}
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Report ID: <code className="bg-slate-100 px-2 py-1 rounded">{caseData.safetyreportid}</code>
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
