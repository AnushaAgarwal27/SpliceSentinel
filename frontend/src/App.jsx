import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { Dna, Eye, Home } from 'lucide-react'
import './App.css'

import LandingPage from './components/LandingPage.jsx'
import FileUploadPage from './components/FileUploadPage'
import QueryProgress from './components/QueryProgress'
import AnalysisSummary, { AnalysisHeader, SummaryStats, ReactionsTable } from './components/AnalysisSummary'
import SimilarCasesExpandable from './components/SimilarCasesExpandable'
import NarrativeSummary from './components/NarrativeSummary'
import ClinicalNote from './components/ClinicalNote'
import ProofPage from './components/ProofPage'

export default function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [results, setResults] = useState(null)
  const [patientData, setPatientData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({})
  const [showProof, setShowProof] = useState(false)
  const performingCheckRef = useRef(false)

  const handleExtractedData = async (data) => {
    await performDrugCheck(data)
  }

  const performDrugCheck = async (patientData) => {
    // Prevent double-execution from React.StrictMode in development
    if (performingCheckRef.current) {
      return
    }
    performingCheckRef.current = true

    setLoading(true)
    setError(null)
    setResults(null)
    setProgress({})

    try {
      // Show query progress
      setProgress({ stage: 'querying' })

      const currentMeds = Array.isArray(patientData.patient_current_meds)
        ? patientData.patient_current_meds
        : patientData.patient_current_meds?.split(',').map(s => s.trim()).filter(s => s) || []

      const response = await axios.post('/api/check-combination', {
        drug_a: patientData.proposed_drug || 'unknown',
        drug_b: currentMeds[0] || 'unknown',
        patient_age: patientData.patient_age,
        patient_sex: patientData.patient_sex,
        patient_conditions: Array.isArray(patientData.patient_conditions) ? patientData.patient_conditions : [],
        patient_current_meds: currentMeds,
      })

      // Show progress stages quickly (200ms each instead of 800ms)
      setProgress({ stage: 'signals' })
      await new Promise(r => setTimeout(r, 200))

      setProgress({ stage: 'similar' })
      await new Promise(r => setTimeout(r, 200))

      setProgress({ stage: 'narrative' })
      await new Promise(r => setTimeout(r, 200))

      setProgress({ stage: 'note' })
      await new Promise(r => setTimeout(r, 100))

      setResults(response.data)
      setPatientData(patientData)
      setProgress({ stage: 'complete' })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to check combination. Make sure backend is running on port 8000.'
      )
      console.error(err)
    } finally {
      setLoading(false)
      performingCheckRef.current = false
    }
  }

  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />
  }

  // If no results, show the upload form
  if (!results && !loading) {
    return (
      <FileUploadPage
        key="upload-form"
        onExtractedData={handleExtractedData}
        onBack={() => setShowLanding(true)}
        loading={loading}
        results={results}
      />
    )
  }

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="bg-card-dark text-white py-10 px-4 border-b border-teal-deep/30">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Branded Logo */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-deep/20 to-gold-muted/20 border border-teal-deep/40 w-fit mb-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Dna size={28} color="#0F4C45" strokeWidth={1.5} />
              </motion.div>
              <h1 className="text-3xl font-serif font-light text-text-off-white tracking-wide">
                Splice Sentinel
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-sm text-text-warm-gray font-sans">
              Real FDA adverse event data to flag dangerous drug combinations
            </p>
          </motion.div>

          {/* Header Buttons */}
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowProof(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-deep/30 hover:bg-teal-deep/40 text-text-off-white font-semibold text-sm rounded-lg transition-all border border-teal-deep/50 hover:border-teal-deep/70 whitespace-nowrap"
            >
              <Eye size={18} strokeWidth={2} />
              Show Proof
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowLanding(true)
                setResults(null)
                setProgress({})
              }}
              className="flex items-center gap-2 px-4 py-2 bg-text-warm-gray/20 hover:bg-text-warm-gray/30 text-text-off-white font-semibold text-sm rounded-lg transition-all border border-text-warm-gray/30 hover:border-text-warm-gray/50 whitespace-nowrap"
            >
              <Home size={18} strokeWidth={2} />
              Back to Home
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-300 rounded-lg"
            >
              ❌ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progressive Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <QueryProgress progress={progress} />
            </motion.div>
          )}

          {results && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* 1. Analysis Header */}
              <AnalysisHeader results={results} />

              {/* 2. Summary Statistics */}
              <SummaryStats results={results} />

              {/* 3. Similar Cases - Expandable Cards */}
              {results.similar_cases && results.similar_cases.length > 0 && (
                <SimilarCasesExpandable
                  cases={results.similar_cases}
                  signals={results.signals}
                  combo_total={results.combo_total}
                  drug_a={results.drug_a}
                  drug_b={results.drug_b}
                  patient_age={patientData?.patient_age}
                  patient_sex={patientData?.patient_sex}
                  patient_conditions={patientData?.patient_conditions || []}
                  patient_current_meds={patientData?.patient_current_meds || []}
                />
              )}

              {/* 4. All Reactions Table */}
              <ReactionsTable results={results} />

              {/* 3. High Risk Signals (PRR ≥ 2.0) */}
              {results.signals && (() => {
                const elevatedSignals = results.signals.filter(s => Math.max(s.prr_vs_drug_a, s.prr_vs_drug_b) >= 2)
                return elevatedSignals.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="rounded-2xl bg-card-dark border border-teal-deep/30 p-8"
                  >
                    <div className="flex gap-4">
                      <div className="text-4xl">⚠️</div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gold-muted mb-4">
                          {elevatedSignals.length} High Risk Signal{elevatedSignals.length !== 1 ? 's' : ''} (PRR ≥ 2.0)
                        </h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {elevatedSignals.map((sig, i) => {
                            const maxPRR = Math.max(sig.prr_vs_drug_a, sig.prr_vs_drug_b)
                            return (
                              <div key={i} className="bg-teal-deep/20 border border-teal-deep/50 rounded p-3 text-sm hover:border-teal-deep transition">
                                <div className="font-bold text-text-off-white">{sig.reaction}</div>
                                <div className="text-xs text-text-warm-gray mt-1">
                                  {sig.combo_count} reports • {((sig.combo_count / results.combo_total) * 100).toFixed(2)}% • PRR: {maxPRR.toFixed(2)}× (A: {sig.prr_vs_drug_a.toFixed(2)}, B: {sig.prr_vs_drug_b.toFixed(2)})
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null
              })()}

              {/* 4. Narrative Summary */}
              {results.narrative_summary && (
                <NarrativeSummary summary={results.narrative_summary} />
              )}

              {/* 5. Clinical Note */}
              {results.clinical_note && (
                <ClinicalNote note={results.clinical_note} />
              )}

              {/* Back Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={() => {
                  setResults(null)
                  setProgress({})
                  setLoading(false)
                  setError(null)
                }}
                className="w-full py-3 bg-teal-deep hover:bg-teal-light text-white font-semibold rounded-lg transition"
              >
                ← Check Another Combination
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-bg-dark border-t border-teal-deep/30 text-text-warm-gray py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <p className="font-sans uppercase tracking-widest text-xs">Data source: FDA FAERS via openFDA API • This tool does not provide medical advice</p>
          <p className="mt-2 text-xs opacity-70">For hackathon demo purposes</p>
        </div>
      </footer>

      {/* Proof Modal */}
      {showProof && results && (
        <ProofPage
          onClose={() => setShowProof(false)}
          drug_a={results.drug_a}
          drug_b={results.drug_b}
        />
      )}
      {showProof && !results && (
        <ProofPage onClose={() => setShowProof(false)} />
      )}
    </div>
  )
}
