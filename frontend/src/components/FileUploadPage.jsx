import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Activity, ArrowRight, ClipboardList, Database, FileCheck2, Pill, Lock, CheckCircle2, RotateCcw, ShieldCheck, X } from 'lucide-react'

const AnimatedBackground = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(34,139,87,0.08), transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(34,139,87,0.06), transparent 40%),
          radial-gradient(circle at 50% 90%, rgba(34,139,87,0.05), transparent 35%)
        `,
        backgroundSize: '200% 200%',
        animation: 'drift 20s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes drift {
          0%, 100% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
        }
      `}</style>
    </div>
  )
}

let fileUploadMountCounter = 0

const intakeSteps = [
  'Attach patient record',
  'Attach prescription',
  'Review extracted context',
  'Run FAERS signal analysis',
]

export default function FileUploadPage({ onExtractedData, onBack }) {
  const [patientReports, setPatientReports] = useState([])
  const [prescription, setPrescription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})
  const [dragActive, setDragActive] = useState(null)
  const extractingRef = useRef(false)
  const confirmingRef = useRef(false)
  const instanceRef = useRef(null)

  if (instanceRef.current === null) {
    fileUploadMountCounter += 1
    instanceRef.current = fileUploadMountCounter
  }

  useEffect(() => {
    console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] mounted`)
    return () => console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] unmounted`)
  }, [])

  useEffect(() => {
    console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] view`, {
      view: extractedData && editMode ? 'review' : 'upload',
      loading,
      patientReportCount: patientReports.length,
      hasPrescription: Boolean(prescription),
    })
  }, [extractedData, editMode, loading, patientReports, prescription])

  const handleDrag = (e, type) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(type)
    } else if (e.type === 'dragleave') {
      setDragActive(null)
    }
  }

  const handleDrop = (e, type) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) processFiles(files, type)
  }

  const processFiles = (files, type) => {
    const allowed = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png']
    const invalidFile = files.find(file => !allowed.includes(file.type))
    if (invalidFile) {
      setError('Only PDF, TXT, JPG, and PNG files allowed')
      return
    }
    if (type === 'report') {
      setPatientReports(prev => {
        const existingKeys = new Set(prev.map(file => `${file.name}-${file.size}-${file.lastModified}`))
        const uniqueNewFiles = files.filter(file => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`))
        return [...prev, ...uniqueNewFiles]
      })
    }
    if (type === 'prescription') setPrescription(files[0])
    setError(null)
  }

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) processFiles(files, type)
    e.target.value = ''
  }

  const removePatientReport = (indexToRemove) => {
    setPatientReports(prev => prev.filter((_file, index) => index !== indexToRemove))
  }

  const handleExtract = async () => {
    if (extractingRef.current) {
      console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] duplicate upload -> review request ignored`)
      return
    }

    if (patientReports.length === 0 || !prescription) {
      setError('Please upload both files')
      return
    }

    extractingRef.current = true
    setLoading(true)
    console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] upload -> review requested`, {
      patientReports: patientReports.map(file => file.name),
      prescription: prescription.name,
    })

    try {
      const formDataObj = new FormData()
      patientReports.forEach(file => {
        formDataObj.append('patient_report', file)
      })
      formDataObj.append('prescription', prescription)

      const response = await axios.post('/api/extract-patient-data', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setExtractedData(response.data)
      setFormData(response.data.extracted_data)
      setEditMode(true)
      console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] upload -> review completed`)
    } catch (err) {
      console.error('Extraction error:', err)
      setError(err.response?.data?.detail || 'Failed to extract data from files')
    } finally {
      setLoading(false)
      extractingRef.current = false
    }
  }

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleConfirm = () => {
    if (confirmingRef.current) {
      console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] duplicate review -> analysis request ignored`)
      return
    }

    confirmingRef.current = true
    console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] review -> analysis requested`)
    onExtractedData({
      ...formData,
      raw_patient_report: extractedData.patient_report_text,
      raw_prescription: extractedData.prescription_text
    })
  }

  const FileUploadBox = ({ label, type, file, files = [] }) => {
    const hasFiles = type === 'report' ? files.length > 0 : Boolean(file)
    const helperText = type === 'report'
      ? 'Drag & drop or click to upload one or more files'
      : 'Drag & drop or click to upload'

    return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onDragEnter={(e) => handleDrag(e, type)}
      onDragLeave={(e) => handleDrag(e, type)}
      onDragOver={(e) => handleDrag(e, type)}
      onDrop={(e) => handleDrop(e, type)}
      whileHover={{ y: -4 }}
      className={`group relative min-h-[260px] overflow-hidden rounded-2xl border p-7 text-left transition-all cursor-pointer ${
        dragActive === type
          ? 'border-gold-muted bg-gold-muted/10 shadow-xl shadow-gold-muted/20'
          : hasFiles
          ? 'border-gold-muted/45 bg-gold-muted/10 shadow-md shadow-gold-muted/10'
          : 'border-teal-deep/35 bg-card-dark/80 hover:border-gold-muted/40 hover:shadow-xl hover:shadow-bg-dark/30'
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-muted/40 to-transparent opacity-0 transition group-hover:opacity-100" />
      <label className="cursor-pointer">
        {type === 'report' ? (
          <input
            type="file"
            accept=".pdf,.txt,.jpg,.png"
            multiple
            onChange={(e) => handleFileChange(e, type)}
            className="hidden"
          />
        ) : (
          <input
            type="file"
            accept=".pdf,.txt,.jpg,.png"
            onChange={(e) => handleFileChange(e, type)}
            className="hidden"
          />
        )}
        <div className="flex h-full flex-col">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div className="rounded-xl border border-teal-deep/35 bg-bg-dark/55 p-3">
              {type === 'report' ? (
                <ClipboardList size={34} className="text-gold-muted" strokeWidth={1.5} />
              ) : (
                <Pill size={34} className="text-gold-muted" strokeWidth={1.5} />
              )}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
              hasFiles ? 'bg-[#7FA88C]/15 text-[#7FA88C]' : 'bg-bg-dark/70 text-text-warm-gray'
            }`}>
              {hasFiles ? 'Ready' : type === 'report' ? 'Step 1' : 'Step 2'}
            </span>
          </div>
          <div className="mb-5">
            <p className="text-xl font-bold text-text-off-white">{label}</p>
            {type === 'report' && files.length > 0 ? (
              <p className="text-text-warm-gray text-sm mt-1">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
            ) : (
              <p className="text-text-warm-gray text-sm mt-1">
                {file ? file.name : helperText}
              </p>
            )}
          </div>
          {!hasFiles && (
            <div className="mt-auto rounded-lg border border-dashed border-text-warm-gray/20 bg-bg-dark/35 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-warm-gray/70">PDF, TXT, JPG, PNG</p>
            </div>
          )}
          {type === 'report' && files.length > 0 && (
            <div className="mt-auto space-y-2 text-left">
              {files.map((selectedFile, index) => (
                <div
                  key={`${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gold-muted/20 bg-bg-dark/40 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-text-off-white">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      removePatientReport(index)
                    }}
                    className="shrink-0 rounded-full p-1 text-text-warm-gray hover:bg-red-500/15 hover:text-red-300"
                    aria-label={`Remove ${selectedFile.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {hasFiles && (
            <p className="mt-auto inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#7FA88C]">
              <CheckCircle2 size={14} />
              Ready
            </p>
          )}
        </div>
      </label>
    </motion.div>
    )
  }

  // Review Extracted Data Page
  if (extractedData && editMode) {
    return (
      <div className="bg-bg-dark w-full min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-card-dark backdrop-blur-sm border border-teal-deep/30 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 size={28} color="#7FA88C" strokeWidth={2} />
              <h2 className="text-3xl font-serif font-light text-text-off-white">Review Extracted Data</h2>
            </div>
            <p className="text-text-warm-gray mb-8 font-sans">Verify the information extracted from your documents. Edit if needed.</p>

            <div className="space-y-6">
              {/* Patient Age - from report */}
              <div className="border-l-4 border-l-[#7FA88C] pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm font-semibold text-text-warm-gray">Patient Age</label>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#7FA88C] bg-[#7FA88C]/15 px-2 py-0.5 rounded-full">From Patient Report</span>
                </div>
                <input
                  type="number"
                  value={formData.patient_age || ''}
                  onChange={(e) => handleFieldChange('patient_age', parseInt(e.target.value) || '')}
                  className="w-full bg-card-dark border border-text-warm-gray/20 rounded-lg px-4 py-2 text-text-off-white focus:border-[#7FA88C] focus:outline-none"
                />
              </div>

              {/* Patient Sex - from report */}
              <div className="border-l-4 border-l-[#7FA88C] pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm font-semibold text-text-warm-gray">Patient Sex</label>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#7FA88C] bg-[#7FA88C]/15 px-2 py-0.5 rounded-full">From Patient Report</span>
                </div>
                <select
                  value={formData.patient_sex || ''}
                  onChange={(e) => handleFieldChange('patient_sex', e.target.value)}
                  className="w-full bg-card-dark border border-text-warm-gray/20 rounded-lg px-4 py-2 text-text-off-white focus:border-[#7FA88C] focus:outline-none"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Medical Conditions - from report */}
              <div className="border-l-4 border-l-[#7FA88C] pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm font-semibold text-text-warm-gray">Medical Conditions</label>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#7FA88C] bg-[#7FA88C]/15 px-2 py-0.5 rounded-full">From Patient Report</span>
                </div>
                <textarea
                  value={formData.patient_conditions?.join(', ') || ''}
                  onChange={(e) => handleFieldChange('patient_conditions', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full bg-card-dark border border-text-warm-gray/20 rounded-lg px-4 py-2 text-text-off-white focus:border-[#7FA88C] focus:outline-none min-h-20"
                  placeholder="e.g., Hypertension, Diabetes"
                />
              </div>

              {/* Current Medications - from report */}
              <div className="border-l-4 border-l-[#7FA88C] pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm font-semibold text-text-warm-gray">Current Medications</label>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#7FA88C] bg-[#7FA88C]/15 px-2 py-0.5 rounded-full">From Patient Report</span>
                </div>
                <textarea
                  value={formData.patient_current_meds?.join(', ') || ''}
                  onChange={(e) => handleFieldChange('patient_current_meds', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full bg-card-dark border border-text-warm-gray/20 rounded-lg px-4 py-2 text-text-off-white focus:border-[#7FA88C] focus:outline-none min-h-20"
                  placeholder="e.g., Aspirin, Lisinopril"
                />
              </div>

              {/* Proposed Drug - from prescription */}
              <div className="border-l-4 border-l-[#C9A35C] pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm font-semibold text-text-warm-gray">Proposed Drug *</label>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#C9A35C] bg-[#C9A35C]/15 px-2 py-0.5 rounded-full">From Prescription</span>
                </div>
                <input
                  type="text"
                  value={formData.proposed_drug || ''}
                  onChange={(e) => handleFieldChange('proposed_drug', e.target.value)}
                  className="w-full bg-card-dark border border-text-warm-gray/20 rounded-lg px-4 py-2 text-text-off-white focus:border-[#C9A35C] focus:outline-none"
                  placeholder="e.g., Ibuprofen"
                />
              </div>

              {/* Medical Indication - from prescription */}
              <div className="border-l-4 border-l-[#C9A35C] pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm font-semibold text-text-warm-gray">Medical Indication</label>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#C9A35C] bg-[#C9A35C]/15 px-2 py-0.5 rounded-full">From Prescription</span>
                </div>
                <input
                  type="text"
                  value={formData.illness_indication || ''}
                  onChange={(e) => handleFieldChange('illness_indication', e.target.value)}
                  className="w-full bg-card-dark border border-text-warm-gray/20 rounded-lg px-4 py-2 text-text-off-white focus:border-[#C9A35C] focus:outline-none"
                  placeholder="e.g., Lower back pain"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => {
                  console.log(`[FlowDebug][FileUploadPage:${instanceRef.current}] review -> upload requested`)
                  confirmingRef.current = false
                  setExtractedData(null)
                  setFormData({})
                  setPatientReports([])
                  setPrescription(null)
                  setEditMode(false)
                }}
                className="px-6 py-3 bg-card-dark hover:bg-card-dark/80 text-text-off-white font-semibold rounded-lg transition-colors border border-text-warm-gray/20 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Upload Different Files
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmingRef.current}
                className="px-6 py-3 bg-gradient-to-r from-[#2d5d55] to-[#3a7068] hover:shadow-lg hover:shadow-[#7FA88C]/30 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} />
                Check Drug Interactions
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-dark w-full min-h-screen px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden">
      <AnimatedBackground />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-deep/70 to-transparent" />
      <div className="max-w-6xl mx-auto relative z-10">
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 rounded-lg border border-teal-deep/30 bg-card-dark/60 px-4 py-2 text-sm font-semibold text-gold-muted transition hover:border-gold-muted/40 hover:bg-gold-muted/10"
        >
          ← Back to Home
        </button>

        <div className="mb-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-deep/40 bg-card-dark/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7FA88C]">
              <FileCheck2 size={14} />
              Intake workspace
            </div>
            <h1 className="max-w-4xl font-serif text-[clamp(3.8rem,7vw,7rem)] font-light leading-[0.92] tracking-normal text-text-off-white">
              Upload Patient Data
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-text-warm-gray">
              Add the patient record and proposed prescription, then review the extracted clinical context before running interaction analysis.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="rounded-2xl border border-teal-deep/30 bg-card-dark/80 p-5 shadow-xl shadow-bg-dark/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-warm-gray">Current intake</p>
                <h2 className="mt-1 text-xl font-bold text-text-off-white">Ready for extraction</h2>
              </div>
              <Activity size={24} className="text-gold-muted" />
            </div>
            <div className="space-y-2">
              {intakeSteps.map((step, index) => {
                const complete = index === 0 ? patientReports.length > 0 : index === 1 ? Boolean(prescription) : false
                return (
                  <div key={step} className="flex items-center gap-3 rounded-lg border border-teal-deep/25 bg-bg-dark/45 px-3 py-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                      complete ? 'bg-[#7FA88C]/18 text-[#7FA88C]' : 'bg-card-dark text-text-warm-gray'
                    }`}>
                      {complete ? <CheckCircle2 size={15} /> : index + 1}
                    </span>
                    <span className="text-sm font-semibold text-text-off-white">{step}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-300 text-sm"
          >
            ❌ {error}
          </motion.div>
        )}

        {/* Upload Boxes */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <FileUploadBox
            label="Patient Medical Report"
            type="report"
            files={patientReports}
          />
          <FileUploadBox
            label="Prescription/Drug Information"
            type="prescription"
            file={prescription}
          />
        </div>

        {/* Extract Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={patientReports.length > 0 && prescription ? { scale: 1.01, opacity: 0.95 } : {}}
          whileTap={patientReports.length > 0 && prescription ? { scale: 0.99 } : {}}
          onClick={handleExtract}
          disabled={loading || patientReports.length === 0 || !prescription}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
            loading || patientReports.length === 0 || !prescription
              ? 'bg-text-warm-gray/20 text-text-warm-gray/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-gold-muted to-[#D7BB76] hover:shadow-lg hover:shadow-gold-muted/20 text-bg-dark font-semibold'
          }`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin">⏳</span> Extracting Data...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <ClipboardList size={18} />
              Extract & Review Data
              <ArrowRight size={18} />
            </span>
          )}
        </motion.button>

        {/* Info Cards */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {/* Supported Files Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card-dark/75 border border-teal-deep/30 rounded-xl p-5 hover:border-gold-muted/40 transition-all"
          >
            <div className="mb-4">
              <ClipboardList size={32} className="text-gold-muted" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-text-off-white mb-2">Supported Files</h3>
            <p className="text-text-warm-gray text-sm">PDF, TXT, JPG, PNG</p>
          </motion.div>

          {/* Privacy Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-card-dark/75 border border-teal-deep/30 rounded-xl p-5 hover:border-gold-muted/40 transition-all"
          >
            <div className="mb-4">
              <Lock size={32} className="text-gold-muted" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-text-off-white mb-2">Privacy</h3>
            <p className="text-text-warm-gray text-sm">Your files are processed securely and not stored.</p>
          </motion.div>

          {/* AI Extraction Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card-dark/75 border border-teal-deep/30 rounded-xl p-5 hover:border-gold-muted/40 transition-all"
          >
            <div className="mb-4">
              <Database size={32} className="text-gold-muted" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-text-off-white mb-2">Signal Context</h3>
            <p className="text-text-warm-gray text-sm">Patient demographics, medications, and conditions feed the FAERS review.</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
