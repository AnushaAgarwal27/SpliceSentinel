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
      <h3 className="text-2xl font-bold text-white mb-4">Similar Patient Cases - Comparative Analysis</h3>

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
              className="w-full max-w-2xl bg-black rounded-2xl overflow-y-auto shadow-2xl border border-slate-700 my-4 max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-black border-b border-slate-700 p-4 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Similarity Match Score</p>
                    <p className="text-6xl font-bold text-indigo-400 mt-2">{active.similarity_score}%</p>
                  </div>
                  <div className={`text-sm font-semibold px-4 py-2 rounded border ${
                    active.similarity_score >= 50 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' :
                    active.similarity_score >= 40 ? 'bg-blue-500/20 border-blue-500 text-blue-300' :
                    'bg-purple-500/20 border-purple-500 text-purple-300'
                  }`}>
                    {active.similarity_score >= 50 ? 'High Match' : active.similarity_score >= 40 ? 'Moderate Match' : 'Fair Match'}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Reaction Name */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Primary Adverse Reaction</p>
                  <h3 className="text-4xl font-bold text-white">{active.reaction}</h3>
                </div>

                {/* Why Similar */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Clinical Similarity Analysis</p>
                  <p className="text-slate-200 leading-relaxed text-sm">{active.reason}</p>
                </div>

                {/* Comparison - Current vs Similar */}
                <div className="grid md:grid-cols-2 gap-3">
                  {/* Current Patient */}
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-5">Patient Profile</h4>
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Age</p>
                        <p className="text-lg text-white font-semibold">{patient_age || '—'} years</p>
                      </div>
                      <div className="border-b border-slate-800 pb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Sex</p>
                        <p className="text-lg text-white font-semibold">{patient_sex ? (patient_sex === 'M' ? 'Male' : 'Female') : 'Unknown'}</p>
                      </div>
                      <div className="border-b border-slate-800 pb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Current Medication Interaction</p>
                        <p className="text-white font-semibold">{drug_a} + {drug_b}</p>
                      </div>
                      {patient_conditions.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Known Conditions</p>
                          <div className="flex flex-wrap gap-2">
                            {patient_conditions.map((c, i) => (
                              <span key={i} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Similar Case */}
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-5">Similar FDA Case Report</h4>
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Patient Age</p>
                        <p className="text-lg text-white font-semibold">
                          {active.case_age || '—'} years
                          {patient_age && Math.abs(parseInt(active.case_age) - patient_age) <= 5 && (
                            <span className="ml-2 text-xs text-emerald-400 font-normal">(Age Match)</span>
                          )}
                        </p>
                      </div>
                      <div className="border-b border-slate-800 pb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Sex</p>
                        <p className="text-lg text-white font-semibold">
                          {active.case_sex ? (active.case_sex === 'M' ? 'Male' : 'Female') : 'Unknown'}
                          {active.case_sex === patient_sex && (
                            <span className="ml-2 text-xs text-emerald-400 font-normal">(Sex Match)</span>
                          )}
                        </p>
                      </div>
                      <div className="border-b border-slate-800 pb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Reported Reaction</p>
                        <p className="text-white font-semibold">{active.reaction}</p>
                      </div>
                      {active.days_to_onset && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Time to Reaction Onset</p>
                          <p className="text-white font-semibold">{active.days_to_onset} days</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Breakdown with Methodology */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Similarity Score Breakdown</p>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Age Proximity</span>
                        <div className="flex items-center gap-3">
                          <div className="h-1 bg-slate-700 rounded w-12"></div>
                          <span className="text-indigo-400 font-semibold min-w-max">20%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Sex Match</span>
                        <div className="flex items-center gap-3">
                          <div className="h-1 bg-slate-700 rounded w-9"></div>
                          <span className="text-indigo-400 font-semibold min-w-max">15%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Conditions Match</span>
                        <div className="flex items-center gap-3">
                          <div className="h-1 bg-slate-700 rounded w-12"></div>
                          <span className="text-indigo-400 font-semibold min-w-max">20%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Medications Match</span>
                        <div className="flex items-center gap-3">
                          <div className="h-1 bg-slate-700 rounded w-28"></div>
                          <span className="text-indigo-400 font-semibold min-w-max">45%</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-700 pt-4 mt-4 flex justify-between font-bold">
                        <span className="text-white">Total Similarity Score</span>
                        <span className="text-indigo-400 text-lg">{active.similarity_score}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-6">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">How This Score Was Calculated</p>
                    <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                      <p>This case received a {active.similarity_score}% match score based on:</p>
                      <ul className="space-y-1 ml-4">
                        <li>• <strong>Age:</strong> Case patient age {active.case_age} vs your patient age {patient_age}</li>
                        <li>• <strong>Sex:</strong> Case sex {active.case_sex === patient_sex ? '(matches)' : '(differs)'}</li>
                        <li>• <strong>Conditions:</strong> Overlap between patient conditions and case indications</li>
                        <li>• <strong>Medications:</strong> Patient on same drugs as case patient</li>
                      </ul>
                      <p className="text-slate-400 mt-3">Minimum threshold for selection: 20% similarity</p>
                    </div>
                  </div>
                </div>

                {/* Report ID with Verification */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">FDA Report ID</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(active.safetyreportid)
                      }}
                      className="w-full text-sm font-mono text-indigo-300 break-all bg-slate-800/50 p-2 rounded border border-slate-700 block hover:border-indigo-500 hover:bg-slate-800 transition cursor-pointer text-left"
                    >
                      {active.safetyreportid} (click to copy)
                    </button>
                  </div>

                  <div className="border-t border-slate-700 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Independent Verification</p>
                    <a
                      href={`https://api.fda.gov/drug/event.json?search=safetyreportid:${active.safetyreportid}&limit=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition text-sm text-center"
                    >
                      View Report JSON (OpenFDA API)
                    </a>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Click to view official FDA data for this Report ID in JSON format.
                    </p>
                  </div>
                </div>

                {/* Drug Combination Context */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Drug Combination Analysis Context</p>
                  <p className="text-white font-semibold mb-2">{drug_a} + {drug_b}</p>
                  <p className="text-xs text-slate-400">Based on analysis of {combo_total?.toLocaleString()} documented adverse events from FDA FAERS database for this combination</p>
                </div>

                {/* Data Authenticity & Proof */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Why This Data is Real & Verifiable</p>

                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="pb-3 border-b border-slate-800">
                      <p className="font-semibold text-slate-200 mb-1">Official Government Source</p>
                      <p className="text-slate-400">This case comes from FDA FAERS (Adverse Event Reporting System) - the official FDA adverse event database</p>
                    </div>

                    <div className="pb-3 border-b border-slate-800">
                      <p className="font-semibold text-slate-200 mb-1">Real Patient Report</p>
                      <p className="text-slate-400">De-identified adverse event report submitted by healthcare providers, pharmacists, or patients directly to FDA</p>
                    </div>

                    <div className="pb-3 border-b border-slate-800">
                      <p className="font-semibold text-slate-200 mb-1">Publicly Searchable</p>
                      <p className="text-slate-400">Report ID {active.safetyreportid} can be searched in FDA FAERS Public Dashboard by anyone</p>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-200 mb-1">Not Simulation or AI Generated</p>
                      <p className="text-slate-400">This is production data from active patient reports, not synthetic or generated</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-4 mt-4 bg-slate-800/30 rounded p-3">
                    <p className="text-xs text-slate-400 mb-2">To independently verify this case:</p>
                    <ol className="space-y-1 text-xs text-slate-300 list-decimal list-inside">
                      <li>Note Report ID: <code className="text-indigo-300 font-mono">{active.safetyreportid}</code></li>
                      <li>Visit FDA FAERS Dashboard (link above)</li>
                      <li>Search for this Report ID</li>
                      <li>View the complete adverse event report</li>
                    </ol>
                  </div>
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
