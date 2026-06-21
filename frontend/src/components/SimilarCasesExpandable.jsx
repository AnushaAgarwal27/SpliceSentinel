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

export default function SimilarCasesExpandable({ cases = [], signals = [], combo_total = 0, drug_a = '', drug_b = '' }) {
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
    if (similarity >= 50) return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-400' }
    if (similarity >= 40) return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-400' }
    return { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-400' }
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
          <div className="fixed inset-0 grid place-items-center z-[100] p-4">
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
              className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className={`${getSimilarityColor(active.similarity_score).bg} p-6 text-white`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-semibold opacity-90">Similarity Match</p>
                    <p className="text-4xl font-bold">{active.similarity_score}%</p>
                  </div>
                  <div className="text-4xl">🔗</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Reaction Name */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Adverse Reaction</p>
                  <h3 className="text-2xl font-bold text-slate-900">{active.reaction}</h3>
                </div>

                {/* Why Similar */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Why Similar</p>
                  <p className="text-slate-700">{active.reason}</p>
                </div>

                {/* Patient Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Age</p>
                    <p className="text-lg font-bold text-slate-900">{active.case_age || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Sex</p>
                    <p className="text-lg font-bold text-slate-900">
                      {active.case_sex ? (active.case_sex === 'M' ? '♂ Male' : '♀ Female') : '—'}
                    </p>
                  </div>
                  {active.days_to_onset && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Onset (Days)</p>
                      <p className="text-lg font-bold text-slate-900">{active.days_to_onset}</p>
                    </div>
                  )}
                </div>

                {/* Report ID */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">FDA Report ID</p>
                  <code className="text-sm font-mono text-indigo-900 break-all">{active.safetyreportid}</code>
                </div>

                {/* Drug Combination */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Drug Combination</p>
                  <p className="text-slate-900 font-semibold">
                    {drug_a} + {drug_b}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">From {combo_total?.toLocaleString()} total adverse reports</p>
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
              <div className="flex flex-wrap gap-2 mb-4">
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

              {/* View Button */}
              <button className={`w-full ${colors.bg} text-white font-semibold py-2 rounded-lg hover:opacity-90 transition text-sm`}>
                View Details
              </button>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
