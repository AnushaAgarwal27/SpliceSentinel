import { useState, useEffect } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'

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
    }
  }, [parentResults, parentLoading])

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
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        dragActive === type
          ? 'border-indigo-400 bg-indigo-900/20'
          : file
          ? 'border-indigo-500/50 bg-indigo-900/10'
          : 'border-slate-600 hover:border-indigo-500/50'
      }`}
    >
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".pdf,.txt,.jpg,.png"
          onChange={(e) => handleFileChange(e, type)}
          className="hidden"
        />
        <div className="space-y-3">
          <div className="text-4xl">
            {type === 'report' ? '📋' : '💊'}
          </div>
          <div>
            <p className="text-white font-semibold">{label}</p>
            <p className="text-slate-400 text-sm mt-1">
              {file ? file.name : 'Drag & drop or click to upload'}
            </p>
          </div>
          {!file && (
            <p className="text-xs text-slate-500">PDF, TXT, JPG, PNG</p>
          )}
          {file && (
            <p className="text-xs text-indigo-400 font-semibold">✓ Ready</p>
          )}
        </div>
      </label>
    </motion.div>
  )

  // Review Extracted Data Page
  if (extractedData && editMode) {
    return (
      <div className="bg-black w-full min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8"
          >
            <h2 className="text-3xl font-bold text-white mb-2">✅ Review Extracted Data</h2>
            <p className="text-slate-300 mb-8">Verify the information extracted from your documents. Edit if needed.</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Patient Age</label>
                <input
                  type="number"
                  value={formData.patient_age || ''}
                  onChange={(e) => handleFieldChange('patient_age', parseInt(e.target.value) || '')}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Patient Sex</label>
                <select
                  value={formData.patient_sex || ''}
                  onChange={(e) => handleFieldChange('patient_sex', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Medical Conditions</label>
                <textarea
                  value={formData.patient_conditions?.join(', ') || ''}
                  onChange={(e) => handleFieldChange('patient_conditions', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none min-h-20"
                  placeholder="e.g., Hypertension, Diabetes"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Current Medications</label>
                <textarea
                  value={formData.patient_current_meds?.join(', ') || ''}
                  onChange={(e) => handleFieldChange('patient_current_meds', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none min-h-20"
                  placeholder="e.g., Aspirin, Lisinopril"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Proposed Drug *</label>
                <input
                  type="text"
                  value={formData.proposed_drug || ''}
                  onChange={(e) => handleFieldChange('proposed_drug', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g., Ibuprofen"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Medical Indication</label>
                <input
                  type="text"
                  value={formData.illness_indication || ''}
                  onChange={(e) => handleFieldChange('illness_indication', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
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
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                ↺ Upload Different Files
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                ✓ Check Drug Interactions
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black w-full min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-semibold mb-6"
          >
            ← Back to Home
          </button>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Upload Patient Data
          </h1>
          <p className="text-xl text-slate-300">
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
          whileHover={{ scale: patientReport && prescription ? 1.02 : 1 }}
          whileTap={{ scale: patientReport && prescription ? 0.98 : 1 }}
          onClick={handleExtract}
          disabled={loading || !patientReport || !prescription}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
            loading || !patientReport || !prescription
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              ⏳ Extracting Data...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              📋 Extract & Review Data
            </span>
          )}
        </motion.button>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl p-6"
        >
          <p className="text-slate-300 text-sm leading-relaxed">
            <span className="font-semibold text-indigo-300">📄 Supported files:</span> PDF, TXT, JPG, PNG
            <br />
            <span className="font-semibold text-indigo-300 block mt-2">🔒 Privacy:</span> Your files are processed securely and not stored.
            <br />
            <span className="font-semibold text-indigo-300 block mt-2">⚡ AI Extraction:</span> Our AI will automatically extract patient demographics, medications, and conditions.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
