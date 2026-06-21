import { useState } from 'react'
import { motion } from 'framer-motion'

export default function PrescriptionForm({ patientData, onSubmit, onBack, disabled }) {
  const [formData, setFormData] = useState({
    proposedDrug: '',
    indication: '',
    dosage: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.proposedDrug) {
      alert('Please enter the proposed drug name')
      return
    }
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <h2 style={{ marginTop: 0, color: '#333', fontSize: '20px', marginBottom: '20px' }}>
        💊 New Prescription
      </h2>

      {/* Patient Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          lineHeight: '1.6'
        }}
      >
        <h4 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>Patient Summary</h4>
        <div style={{ color: '#555' }}>
          <div><strong>Age:</strong> {patientData.patientAge}</div>
          <div><strong>Sex:</strong> {patientData.patientSex}</div>
          {patientData.patientConditions && (
            <div><strong>Conditions:</strong> {patientData.patientConditions}</div>
          )}
          {patientData.patientCurrentMeds && (
            <div><strong>Current Meds:</strong> {patientData.patientCurrentMeds}</div>
          )}
        </div>
      </motion.div>

      {/* Proposed Drug */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{ marginBottom: '20px' }}
      >
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
          Proposed Drug Name *
        </label>
        <input
          type="text"
          name="proposedDrug"
          value={formData.proposedDrug}
          onChange={handleChange}
          placeholder="e.g., Ibuprofen"
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px'
          }}
          onFocus={(e) => e.target.style.borderColor = '#764ba2'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
      </motion.div>

      {/* Indication */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        style={{ marginBottom: '20px' }}
      >
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
          Indication / Reason (optional)
        </label>
        <textarea
          name="indication"
          value={formData.indication}
          onChange={handleChange}
          placeholder="e.g., Chronic joint pain, lower back pain"
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            minHeight: '60px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
          onFocus={(e) => e.target.style.borderColor = '#764ba2'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
      </motion.div>

      {/* Dosage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ marginBottom: '20px' }}
      >
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
          Dosage (optional)
        </label>
        <input
          type="text"
          name="dosage"
          value={formData.dosage}
          onChange={handleChange}
          placeholder="e.g., 400mg three times daily"
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px'
          }}
          onFocus={(e) => e.target.style.borderColor = '#764ba2'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
      </motion.div>

      {/* Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          style={{
            padding: '12px',
            backgroundColor: '#f0f0f0',
            color: '#333',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          ← Back to Patient Info
        </button>
        <button
          type="submit"
          disabled={disabled}
          style={{
            padding: '12px',
            backgroundColor: disabled ? '#ccc' : '#764ba2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = '#63397a')}
          onMouseLeave={(e) => !disabled && (e.target.style.backgroundColor = '#764ba2')}
        >
          Check Drug Risk 🔍
        </button>
      </div>
    </motion.form>
  )
}
