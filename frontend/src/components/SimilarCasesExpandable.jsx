import React, { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useOutsideClick } from '../hooks/use-outside-click'

export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.05 } }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-white"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  )
}

export default function SimilarCasesExpandable({
  cases = [],
  signals = [],
  combo_total = 0,
  drug_a = '',
  drug_b = '',
  patient_age = null,
  patient_sex = null,
  patient_conditions = [],
  patient_current_meds = []
}) {
  const [active, setActive] = useState(null)
  const ref = useRef(null)
  const id = useId()

  if (!cases || cases.length === 0) return null

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setActive(false)
      }
    }

    if (active && typeof active === 'object') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active])

  useOutsideClick(ref, () => setActive(null))

  const getSimilarityColor = (similarity) => {
    if (similarity >= 50) return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-400', lightBg: 'bg-emerald-600/20', lightBorder: 'border-emerald-500/30' }
    if (similarity >= 40) return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-400', lightBg: 'bg-blue-600/20', lightBorder: 'border-blue-500/30' }
    return { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-400', lightBg: 'bg-purple-600/20', lightBorder: 'border-purple-500/30' }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      <h3 className="text-2xl font-bold text-white mb-4">👥 Similar Patient Cases</h3>

      <AnimatePresence>
        {active && typeof active === 'object' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 h-full w-full z-10 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && typeof active === 'object' ? (
          <div className="fixed inset-0 grid place-items-center z-[100] p-4 overflow-y-auto">
            <motion.button
              key={`button-${active.safetyreportid}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 lg:hidden items-center justify-center bg-indigo-600 hover:bg-indigo-700 rounded-full h-10 w-10 shadow-lg transition"
              onClick={() => setActive(null)}
            >
              <CloseIcon />
            </motion.button>

            <motion.div
              layoutId={`card-${active.safetyreportid}-${id}`}
              ref={ref}
              className="w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 my-8"
            >
              {/* Header */}
              <div className={`${getSimilarityColor(active.similarity_score).bg} p-8 text-white`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold opacity-90">Similarity Match</p>
                    <p className="text-5xl font-bold">{active.similarity_score}%</p>
                  </div>
                  <div className="text-5xl">🔗</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Reaction Name */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Adverse Reaction</p>
                  <h3 className="text-3xl font-bold text-white">{active.reaction}</h3>
                </div>

                {/* Why Similar */}
                <div className={`${getSimilarityColor(active.similarity_score).lightBg} ${getSimilarityColor(active.similarity_score).lightBorder} border rounded-lg p-4`}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Why This is a Match</p>
                  <p className="text-slate-200">{active.reason}</p>
                </div>

                {/* Comparison - Current vs Similar */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Current Patient */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span>👤 Your Patient</span>
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Age</p>
                        <p className="text-white font-semibold">{patient_age || '—'} years</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Sex</p>
                        <p className="text-white font-semibold">{patient_sex ? (patient_sex === 'M' ? '♂ Male' : '♀ Female') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Drug Combination</p>
                        <p className="text-white font-semibold">{drug_a} + {drug_b}</p>
                      </div>
                      {patient_conditions.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Conditions</p>
                          <div className="flex flex-wrap gap-2">
                            {patient_conditions.map((c, i) => (
                              <span key={i} className="text-xs bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 px-2 py-1 rounded">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Similar Case */}
                  <div className={`${getSimilarityColor(active.similarity_score).lightBg} ${getSimilarityColor(active.similarity_score).lightBorder} border rounded-lg p-6`}>
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span>🔍 Similar FDA Case</span>
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Age</p>
                        <p className="text-white font-semibold">{active.case_age || '—'} years {patient_age && Math.abs(parseInt(active.case_age) - patient_age) <= 5 ? '✅' : ''}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Sex</p>
                        <p className="text-white font-semibold">{active.case_sex ? (active.case_sex === 'M' ? '♂ Male' : '♀ Female') : '—'} {active.case_sex === patient_sex ? '✅' : ''}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Reaction Reported</p>
                        <p className="text-white font-semibold">{active.reaction}</p>
                      </div>
                      {active.days_to_onset && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Days to Onset</p>
                          <p className="text-white font-semibold">{active.days_to_onset} days</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Breakdown */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-sm font-semibold text-white mb-4">📊 How the {active.similarity_score}% Match is Calculated</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>🎂 Age Proximity</span>
                      <span>20%</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>♂️ Sex Match</span>
                      <span>15%</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>🏥 Conditions Match</span>
                      <span>20%</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>💊 Medications Match</span>
                      <span>45%</span>
                    </div>
                    <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between font-bold text-white">
                      <span>Total Similarity</span>
                      <span>{active.similarity_score}%</span>
                    </div>
                  </div>
                </div>

                {/* Report ID */}
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">📋 FDA Report ID</p>
                  <code className="text-sm font-mono text-indigo-300 break-all">{active.safetyreportid}</code>
                  <p className="text-xs text-slate-400 mt-2">✓ Verifiable on FDA.gov</p>
                </div>

                {/* Drug Combination Context */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">💊 Drug Combination Context</p>
                  <p className="text-white font-semibold mb-1">{drug_a} + {drug_b}</p>
                  <p className="text-xs text-slate-400">From {combo_total?.toLocaleString()} total adverse reports in FDA FAERS</p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map((caseData, index) => {
          const colors = getSimilarityColor(caseData.similarity_score)
          return (
            <motion.div
              layoutId={`card-${caseData.safetyreportid}-${id}`}
              key={`card-${caseData.safetyreportid}-${id}`}
              onClick={() => setActive(caseData)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`bg-white border-2 ${colors.border} rounded-xl p-4 hover:shadow-lg cursor-pointer transition-all hover:scale-105`}
            >
              {/* Similarity Badge */}
              <div className={`${colors.bg} text-white px-3 py-1 rounded-full font-bold text-sm inline-block mb-3`}>
                {caseData.similarity_score}% Match
              </div>

              {/* Reaction */}
              <h4 className="text-sm font-bold text-slate-900 mb-2 line-clamp-2">
                {caseData.reaction}
              </h4>

              {/* Why Similar */}
              <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                {caseData.reason}
              </p>

              {/* Patient Info Tags */}
              <div className="flex flex-wrap gap-2">
                {caseData.case_age && (
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium">
                    Age {caseData.case_age}
                  </span>
                )}
                {caseData.case_sex && (
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium">
                    {caseData.case_sex === 'M' ? '♂ Male' : '♀ Female'}
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
