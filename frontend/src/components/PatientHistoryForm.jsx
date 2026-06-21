import { useState } from 'react'
import { motion } from 'framer-motion'

export default function PatientHistoryForm({ onSubmit, disabled }) {
  const [formData, setFormData] = useState({
    patientAge: '',
    patientSex: '',
    patientConditions: '',
    patientCurrentMeds: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.patientAge || !formData.patientSex) {
      alert('Please enter patient age and sex')
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
        📋 Patient Medical History
      </h2>

      {/* Age and Sex */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
            Age *
          </label>
          <input
            type="number"
            name="patientAge"
            value={formData.patientAge}
            onChange={handleChange}
            placeholder="e.g., 55"
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
            Sex *
          </label>
          <select
            name="patientSex"
            value={formData.patientSex}
            onChange={handleChange}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </motion.div>
      </div>

      {/* Conditions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{ marginBottom: '20px' }}
      >
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
          Medical Conditions (comma-separated, optional)
        </label>
        <textarea
          name="patientConditions"
          value={formData.patientConditions}
          onChange={handleChange}
          placeholder="e.g., Hypertension, Type 2 Diabetes, History of DVT"
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            minHeight: '80px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
      </motion.div>

      {/* Current Medications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ marginBottom: '20px' }}
      >
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
          Current Medications (comma-separated)
        </label>
        <textarea
          name="patientCurrentMeds"
          value={formData.patientCurrentMeds}
          onChange={handleChange}
          placeholder="e.g., Aspirin, Norvasc, Metoprolol, Lovastatin"
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            minHeight: '80px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
      </motion.div>

      <button
        type="submit"
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: disabled ? '#ccc' : '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.3s'
        }}
        onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = '#5568d3')}
        onMouseLeave={(e) => !disabled && (e.target.style.backgroundColor = '#667eea')}
      >
        Continue to Prescription →
      </button>
    </motion.form>
  )
}
