import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import './App.css'

import LandingPage from './components/LandingPage.jsx'
import FileUploadPage from './components/FileUploadPage'
import QueryProgress from './components/QueryProgress'
import AnalysisSummary from './components/AnalysisSummary'
import SimilarCasesExpandable from './components/SimilarCasesExpandable'
import NarrativeSummary from './components/NarrativeSummary'
import ClinicalNote from './components/ClinicalNote'
import ProofPage from './components/ProofPage'

export default function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({})
  const [showProof, setShowProof] = useState(false)

  const handleExtractedData = async (data) => {
    console.log('🟢 handleExtractedData called with:', data)
    await performDrugCheck(data)
  }

  const performDrugCheck = async (patientData) => {
    console.log('🔵 performDrugCheck started with:', patientData)
    setLoading(true)
    setError(null)
    setResults(null)
    setProgress({})

    try {
      // Show query progress
      setProgress({ stage: 'querying' })
      console.log('🟡 Querying openFDA...')

      const currentMeds = Array.isArray(patientData.patient_current_meds)
        ? patientData.patient_current_meds
        : patientData.patient_current_meds?.split(',').map(s => s.trim()).filter(s => s) || []

      console.log('📋 Request data:', {
        drug_a: patientData.proposed_drug,
        drug_b: currentMeds[0],
        patient_age: patientData.patient_age,
        patient_sex: patientData.patient_sex,
        conditions_count: (patientData.patient_conditions || []).length,
        meds_count: currentMeds.length
      })

      const response = await axios.post('/api/check-combination', {
        drug_a: patientData.proposed_drug || 'unknown',
        drug_b: currentMeds[0] || 'unknown',
        patient_age: patientData.patient_age,
        patient_sex: patientData.patient_sex,
        patient_conditions: Array.isArray(patientData.patient_conditions) ? patientData.patient_conditions : [],
        patient_current_meds: currentMeds,
      })

      console.log('✅ API response received:', {
        combo_total: response.data.combo_total,
        signals_count: response.data.signals?.length,
        similar_cases_count: response.data.similar_cases?.length
      })

      // Simulate progressive reveal (in real app, backend would stream)
      setProgress({ stage: 'signals' })
      await new Promise(r => setTimeout(r, 800))

      setProgress({ stage: 'similar' })
      await new Promise(r => setTimeout(r, 800))

      setProgress({ stage: 'narrative' })
      await new Promise(r => setTimeout(r, 800))

      setProgress({ stage: 'note' })
      await new Promise(r => setTimeout(r, 400))

      console.log('🟢 Setting results...')
      setResults(response.data)
      console.log('🟢 Results set successfully')
      setProgress({ stage: 'complete' })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to check combination. Make sure backend is running on port 8000.'
      )
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />
  }

  // If no results, show the upload form
  if (!results && !loading) {
    return (
      <FileUploadPage
        onExtractedData={handleExtractedData}
        onBack={() => setShowLanding(true)}
        loading={loading}
        results={results}
      />
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white py-12 px-4 border-b border-indigo-500/30">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-2">
              🔬 Drug Interaction Checker
            </h1>
            <p className="text-lg opacity-90">
              Real FDA adverse event data to flag dangerous drug combinations
            </p>
          </motion.div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowProof(true)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              ✅ Show Proof
            </button>
            <button
              onClick={() => {
                setShowLanding(true)
                setResults(null)
                setProgress({})
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              ← Back to Home
            </button>
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
              className="mb-6 p-4 bg-red-900/20 border border-red-500/50 text-red-300 rounded-lg"
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
              {/* 1. Analysis Summary - Reactions Table */}
              <AnalysisSummary results={results} />

              {/* 2. Similar Cases - Expandable Cards */}
              {results.similar_cases && results.similar_cases.length > 0 && (
                <SimilarCasesExpandable
                  cases={results.similar_cases}
                  signals={results.signals}
                  combo_total={results.combo_total}
                  drug_a={results.drug_a}
                  drug_b={results.drug_b}
                />
              )}

              {/* 3. High Risk Signals (PRR ≥ 2.0) */}
              {results.signals && (() => {
                const elevatedSignals = results.signals.filter(s => Math.max(s.prr_vs_drug_a, s.prr_vs_drug_b) >= 2)
                return elevatedSignals.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="rounded-2xl bg-gradient-to-br from-indigo-900/20 to-cyan-900/20 border border-indigo-500/30 p-8"
                  >
                    <div className="flex gap-4">
                      <div className="text-4xl">⚠️</div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-indigo-300 mb-4">
                          {elevatedSignals.length} High Risk Signal{elevatedSignals.length !== 1 ? 's' : ''} (PRR ≥ 2.0)
                        </h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {elevatedSignals.map((sig, i) => {
                            const maxPRR = Math.max(sig.prr_vs_drug_a, sig.prr_vs_drug_b)
                            return (
                              <div key={i} className="bg-indigo-900/20 border border-indigo-500/30 rounded p-3 text-sm hover:border-indigo-500/60 transition">
                                <div className="font-bold text-indigo-200">{sig.reaction}</div>
                                <div className="text-xs text-indigo-300 mt-1">
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
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
              >
                ← Check Another Combination
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-indigo-500/30 text-slate-400 py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <p>Data source: FDA FAERS via openFDA API • This tool does not provide medical advice</p>
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
