import { useState, useEffect } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { ClipboardList, Pill, Lock, Zap, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react'

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

export default function FileUploadPage({ onExtractedData, onBack, loading: parentLoading, results: parentResults }) {
  const [patientReport, setPatientReport] = useState(null)
  const [prescription, setPrescription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})
  const [dragActive, setDragActive] = useState(null)


  useEffect(() => {
    // Reset form completely when coming back to upload another combination
    if (parentResults === null && !parentLoading) {
      setExtractedData(null)
      setFormData({})
      setPatientReport(null)
      setPrescription(null)
      setEditMode(false)
      setError(null)
      setLoading(false)
      setDragActive(null)
    }
  }, [parentResults, parentLoading])

  // Extra safety: if we have extracted data but parent has results, clear local state
  useEffect(() => {
    if (parentResults !== null && parentResults !== undefined) {
      setExtractedData(null)
      setFormData({})
      setPatientReport(null)
      setPrescription(null)
      setEditMode(false)
    }
  }, [parentResults])

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
    const file = e.dataTransfer.files[0]
    if (file) processFile(file, type)
  }

  const processFile = (file, type) => {
    const allowed = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setError('Only PDF, TXT, JPG, and PNG files allowed')
      return
    }
    if (type === 'report') setPatientReport(file)
    if (type === 'prescription') setPrescription(file)
    setError(null)
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    if (file) processFile(file, type)
  }

  const handleExtract = async () => {
    if (!patientReport || !prescription) {
      setError('Please upload both files')
      return
    }

    setLoading(true)

    try {
      const formDataObj = new FormData()
      formDataObj.append('patient_report', patientReport)
      formDataObj.append('prescription', prescription)

      const response = await axios.post('/api/extract-patient-data', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setExtractedData(response.data)
      setFormData(response.data.extracted_data)
      setEditMode(true)
    } catch (err) {
      console.error('Extraction error:', err)
      setError(err.response?.data?.detail || 'Failed to extract data from files')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleConfirm = () => {
    onExtractedData({
      ...formData,
      raw_patient_report: extractedData.patient_report_text,
      raw_prescription: extractedData.prescription_text
    })
  }

  const FileUploadBox = ({ label, type, file, dragType }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onDragEnter={(e) => handleDrag(e, type)}
      onDragLeave={(e) => handleDrag(e, type)}
      onDragOver={(e) => handleDrag(e, type)}
      onDrop={(e) => handleDrop(e, type)}
      whileHover={{ y: -4 }}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        dragActive === type
          ? 'border-gold-muted bg-gold-muted/10 shadow-lg shadow-gold-muted/20'
          : file
          ? 'border-gold-muted/60 bg-gold-muted/5 shadow-md shadow-gold-muted/10'
          : 'border-text-warm-gray/30 hover:border-gold-muted/50 hover:shadow-lg hover:shadow-gold-muted/15'
      }`}
    >
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".pdf,.txt,.jpg,.png"
          onChange={(e) => handleFileChange(e, type)}
          className="hidden"
        />
        <div className="space-y-4">
          <div className="flex justify-center">
            {type === 'report' ? (
              <ClipboardList size={40} className="text-gold-muted" strokeWidth={1.5} />
            ) : (
              <Pill size={40} className="text-gold-muted" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <p className="text-text-off-white font-semibold">{label}</p>
            <p className="text-text-warm-gray text-sm mt-1">
              {file ? file.name : 'Drag & drop or click to upload'}
            </p>
          </div>
          {!file && (
            <p className="text-xs text-text-warm-gray/60">PDF, TXT, JPG, PNG</p>
          )}
          {file && (
            <p className="text-xs text-gold-muted font-semibold">✓ Ready</p>
          )}
        </div>
      </label>
    </motion.div>
  )

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
                  setExtractedData(null)
                  setFormData({})
                  setPatientReport(null)
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
    <div className="bg-bg-dark w-full min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      <AnimatedBackground />
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-gold-muted hover:text-gold-muted/80 text-sm font-semibold mb-6"
          >
            ← Back to Home
          </button>
          <h1 className="text-5xl md:text-6xl font-serif font-light text-text-off-white mb-4">
            Upload Patient Data
          </h1>
          <p className="text-lg text-text-warm-gray font-sans">
            Upload medical records and prescription. Our AI will extract everything automatically.
          </p>
        </motion.div>

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
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <FileUploadBox
            label="Patient Medical Report"
            type="report"
            file={patientReport}
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
          whileHover={patientReport && prescription ? { scale: 1.01, opacity: 0.95 } : {}}
          whileTap={patientReport && prescription ? { scale: 0.99 } : {}}
          onClick={handleExtract}
          disabled={loading || !patientReport || !prescription}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
            loading || !patientReport || !prescription
              ? 'bg-text-warm-gray/20 text-text-warm-gray/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-gold-muted to-gold-muted hover:shadow-lg hover:shadow-gold-muted/20 text-bg-dark font-semibold'
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
            </span>
          )}
        </motion.button>

        {/* Info Cards */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {/* Supported Files Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card-dark border border-gold-muted/30 rounded-xl p-6 text-center hover:border-gold-muted/60 transition-all"
          >
            <div className="flex justify-center mb-4">
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
            className="bg-card-dark border border-gold-muted/30 rounded-xl p-6 text-center hover:border-gold-muted/60 transition-all"
          >
            <div className="flex justify-center mb-4">
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
            className="bg-card-dark border border-gold-muted/30 rounded-xl p-6 text-center hover:border-gold-muted/60 transition-all"
          >
            <div className="flex justify-center mb-4">
              <Zap size={32} className="text-gold-muted" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-text-off-white mb-2">AI Extraction</h3>
            <p className="text-text-warm-gray text-sm">Automatically extract patient demographics, medications, and conditions.</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
