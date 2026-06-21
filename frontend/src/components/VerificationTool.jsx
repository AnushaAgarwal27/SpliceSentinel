import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function VerificationTool({ isOpen, onClose }) {
  const [reportId, setReportId] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  const handleSearch = async () => {
    if (!reportId.trim()) return

    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const response = await fetch(
        `http://localhost:8000/api/verify-report/${reportId.trim()}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || `Report not found`)
      }
      setReport(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-20 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 grid place-items-center z-30 p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-2xl bg-black rounded-2xl shadow-2xl border border-slate-700 p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Verify FDA Report</h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              {/* Search Input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  FDA Report ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Report ID (e.g., 10285688)"
                    value={reportId}
                    onChange={(e) => setReportId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading || !reportId.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition"
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-300 text-sm">
                  ❌ {error}
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Report Details */}
              {report && (
                <div className="space-y-4">
                  {/* Report ID - Prominent */}
                  <div className="bg-indigo-600/20 border border-indigo-500 rounded-lg p-4">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
                      ✓ Report Found
                    </p>
                    <p className="text-xl font-mono font-bold text-indigo-300">{report.report_id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                        Received Date
                      </p>
                      <p className="text-white text-sm">
                        {report.receive_date && report.receive_date !== 'Unknown'
                          ? new Date(report.receive_date).toLocaleDateString()
                          : 'Unknown'}
                      </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                        Patient Age
                      </p>
                      <p className="text-white text-sm">{report.patient_age} years</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 col-span-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                        Patient Sex
                      </p>
                      <p className="text-white text-sm">
                        {report.patient_sex === 'M'
                          ? 'Male'
                          : report.patient_sex === 'F'
                          ? 'Female'
                          : report.patient_sex}
                      </p>
                    </div>
                  </div>

                  {/* Reactions */}
                  {report.reactions && report.reactions.length > 0 && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                        Reported Adverse Reactions
                      </p>
                      <div className="space-y-1">
                        {report.reactions.map((reaction, i) => (
                          <div key={i} className="text-sm text-slate-300">
                            • {reaction}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drugs */}
                  {report.drugs && report.drugs.length > 0 && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                        Reported Medications
                      </p>
                      <div className="space-y-1">
                        {report.drugs.map((drug, i) => (
                          <div key={i} className="text-sm text-slate-300">
                            • {drug}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verification Badge */}
                  <div className="bg-emerald-500/20 border border-emerald-500 rounded-lg p-4">
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-2">
                      ✓ Real FDA Data
                    </p>
                    <p className="text-sm text-emerald-300">
                      Retrieved directly from FDA's openFDA database. This is an official adverse event report.
                    </p>
                  </div>
                </div>
              )}

              {/* Initial State */}
              {!report && !loading && (
                <div className="py-12 text-center">
                  <p className="text-slate-400">
                    Paste the FDA Report ID above to verify this case independently.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
