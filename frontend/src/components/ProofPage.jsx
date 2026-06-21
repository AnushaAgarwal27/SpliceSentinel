import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

export default function ProofPage({ onClose, drug_a, drug_b }) {
  const [proofData, setProofData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!drug_a || !drug_b) return

    const fetchProof = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await axios.get(`http://localhost:8000/debug/fda-raw/${drug_a}/${drug_b}`)
        setProofData(response.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProof()
  }, [drug_a, drug_b])

  if (!drug_a || !drug_b) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-700"
        >
          <h2 className="text-white text-xl font-bold mb-3">📋 No Comparison Yet</h2>
          <p className="text-slate-300 mb-6">Complete a drug combination check first to view detailed FDA data analysis.</p>
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Close
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 p-6 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">📊 FDA Data Analysis</h1>
            <p className="text-slate-300">{drug_a?.toUpperCase()} + {drug_b?.toUpperCase()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-white transition"
          >
            ×
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 pb-16">
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="inline-block">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-300">⏳ Fetching real FDA FAERS data...</p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-6"
            >
              <p className="text-red-300">❌ Error: {error}</p>
            </motion.div>
          )}

          {/* Success State */}
          {proofData && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Key Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid md:grid-cols-4 gap-4"
              >
                <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/30 border border-indigo-500/30 rounded-lg p-6">
                  <p className="text-slate-400 text-sm mb-2">Total Reports</p>
                  <p className="text-4xl font-bold text-indigo-400">{proofData.total_reports?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-2">FDA FAERS Database</p>
                </div>

                <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-lg p-6">
                  <p className="text-slate-400 text-sm mb-2">Unique Reactions</p>
                  <p className="text-4xl font-bold text-blue-400">{proofData.total_reactions_found}</p>
                  <p className="text-xs text-slate-500 mt-2">Adverse Events</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-900/30 to-sky-900/30 border border-cyan-500/30 rounded-lg p-6">
                  <p className="text-slate-400 text-sm mb-2">Serious Reports</p>
                  <p className="text-4xl font-bold text-cyan-400">
                    {proofData.sample_reports?.filter(r => r.serious === '1').length || 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Critical Cases</p>
                </div>

                <div className="bg-gradient-to-br from-sky-900/30 to-slate-900/30 border border-sky-500/30 rounded-lg p-6">
                  <p className="text-slate-400 text-sm mb-2">Data Source</p>
                  <p className="text-lg font-bold text-sky-400">✅ Verified</p>
                  <p className="text-xs text-slate-500 mt-2">FDA Official</p>
                </div>
              </motion.div>

              {/* Reactions Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6">🏥 Reported Adverse Reactions</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {proofData.sample_reactions?.slice(0, 12).map((reaction, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.03 }}
                      className="bg-indigo-900/20 border border-indigo-500/30 rounded p-3 hover:border-indigo-500/60 transition"
                    >
                      <p className="text-slate-100 text-sm font-medium">{reaction}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Sample Reports */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6">👥 Sample Patient Records</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {proofData.sample_reports?.slice(0, 5).map((report, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="bg-slate-900/50 border border-slate-700 rounded p-4 hover:border-slate-600 transition"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400 text-xs">Report ID</p>
                          <p className="text-slate-100 font-mono text-xs mt-1">{report.safetyreportid.slice(0, 12)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Age</p>
                          <p className="text-slate-100 font-bold mt-1">{report.patient?.patientonsetage || '—'} yrs</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Serious</p>
                          <p className={`font-bold mt-1 ${report.serious === '1' ? 'text-red-400' : 'text-green-400'}`}>
                            {report.serious === '1' ? '⚠️ YES' : '✓ No'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Country</p>
                          <p className="text-slate-100 mt-1">{report.primarysourcecountry || '—'}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Verification Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border border-indigo-500/30 rounded-lg p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-4">🔐 Verification & Transparency</h2>
                <div className="space-y-3 text-slate-300 text-sm">
                  <p>✅ <strong>Official FDA Source:</strong> All data from FDA FAERS (FDA Adverse Event Reporting System)</p>
                  <p>✅ <strong>Real Patient Data:</strong> De-identified adverse event reports from healthcare providers</p>
                  <p>✅ <strong>Public Database:</strong> Data is publicly accessible via FDA's official API</p>
                  <p>✅ <strong>No Simulations:</strong> This is production data, not synthetic or test data</p>
                </div>
                <div className="mt-6 bg-slate-900/50 rounded p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Query your own data:</p>
                  <code className="text-xs text-indigo-300 break-all font-mono">
                    {`https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${drug_a.toUpperCase()}"+AND+patient.drug.medicinalproduct:"${drug_b.toUpperCase()}"&limit=10`}
                  </code>
                </div>
              </motion.div>

              {/* Disclaimer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 text-center"
              >
                <p className="text-slate-400 text-sm">For educational purposes. Consult medical professionals for clinical decisions.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
