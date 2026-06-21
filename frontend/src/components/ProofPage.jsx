import { useState, useEffect } from 'react'
import axios from 'axios'

export default function ProofPage({ onClose, drug_a = 'warfarin', drug_b = 'ibuprofen' }) {
  const [proofData, setProofData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProof = async () => {
      try {
        console.log(`Fetching proof for: ${drug_a} + ${drug_b}`)
        const response = await axios.get(`http://localhost:8000/debug/fda-raw/${drug_a}/${drug_b}`)
        console.log('Proof data received:', response.data)
        setProofData(response.data)
      } catch (err) {
        console.error('Proof fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProof()
  }, [drug_a, drug_b])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        padding: '30px',
        boxShadow: '0 10px 50px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>✅ Real FDA Data Proof</h1>
          <button
            onClick={onClose}
            style={{
              fontSize: '32px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: 0,
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <p style={{ fontSize: '16px', color: '#666' }}>⏳ Loading real FDA data...</p>
        )}

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: '#ffebee', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#c62828' }}>
            ❌ Error: {error}
          </div>
        )}

        {/* Success Content */}
        {proofData && (
          <>
            {/* Key Stats */}
            <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 15px 0', color: '#2e7d32' }}>🎯 What This Proves</h2>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>✅ Real connection to FDA FAERS database</li>
                <li>✅ <strong>{proofData.total_reports} actual adverse event reports</strong></li>
                <li>✅ Real patient data (age, sex, reactions)</li>
                <li>✅ Government's official database - publicly verifiable</li>
              </ul>
            </div>

            {/* Main Stats */}
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>📊 Live Data from FDA API</h3>
              <div style={{ fontSize: '16px', lineHeight: '1.8' }}>
                <div><strong>Drug Combination:</strong> {proofData.drug_a?.toUpperCase()} + {proofData.drug_b?.toUpperCase()}</div>
                <div style={{ marginTop: '10px' }}>
                  <strong>Total Reports Found:</strong>
                  <span style={{ fontSize: '28px', color: '#667eea', fontWeight: 'bold', marginLeft: '10px' }}>
                    {proofData.total_reports}
                  </span>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <strong>Unique Reactions Detected:</strong> {proofData.total_reactions_found}
                </div>
              </div>
            </div>

            {/* Sample Reactions */}
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>🏥 Real Reactions Found</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {proofData.sample_reactions?.slice(0, 5).map((reaction, i) => (
                  <li key={i} style={{ marginBottom: '8px' }}>{reaction}</li>
                ))}
              </ul>
            </div>

            {/* Sample Patient */}
            {proofData.sample_reports?.[0] && (
              <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>👤 Sample Patient Report</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div><strong>Report ID:</strong> {proofData.sample_reports[0].safetyreportid}</div>
                  <div><strong>Patient Age:</strong> {proofData.sample_reports[0].patient?.patientonsetage || 'N/A'} years</div>
                  <div>
                    <strong>Serious Event:</strong>
                    <span style={{ color: proofData.sample_reports[0].serious === '1' ? '#d32f2f' : '#388e3c' }}>
                      {proofData.sample_reports[0].serious === '1' ? ' YES ⚠️' : ' No'}
                    </span>
                  </div>
                  <div><strong>Country:</strong> {proofData.sample_reports[0].primarysourcecountry}</div>
                  <div><strong>Report Date:</strong> {proofData.sample_reports[0].transmissiondate}</div>
                </div>
              </div>
            )}

            {/* Verification */}
            <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>🔐 How to Verify</h3>
              <p style={{ margin: '0 0 10px 0' }}>This data comes from FDA's official FAERS API. You can verify it yourself:</p>
              <code style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                display: 'block',
                marginBottom: '10px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {`https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${drug_a.toUpperCase()}"+AND+patient.drug.medicinalproduct:"${drug_b.toUpperCase()}"&limit=1`}
              </code>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>No fake data. No simulations. All real. ✅</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
