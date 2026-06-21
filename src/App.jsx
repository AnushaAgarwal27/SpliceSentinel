import React, { useState } from 'react';
import './App.css';

export default function App() {
  const [drugA, setDrugA] = useState('');
  const [drugB, setDrugB] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientConditions, setPatientConditions] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!drugA || !drugB) {
      setError('Please enter both drug names');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const params = new URLSearchParams({
        drug_a: drugA,
        drug_b: drugB,
        ...(patientAge && { patient_age: patientAge }),
        ...(patientConditions && { patient_conditions: patientConditions })
      });

      const response = await fetch(`http://localhost:8000/check-combination?${params}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to check combination. Make sure backend is running on port 8000.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Note copied to clipboard');
  };

  return (
    <div className="container">
      <header className="header">
        <h1>FDA Drug Interaction Check</h1>
        <p className="subtitle">Check real adverse event data for drug combinations</p>
      </header>

      <div className="input-section">
        <div className="input-group">
          <label>Drug A</label>
          <input
            type="text"
            placeholder="e.g., Warfarin"
            value={drugA}
            onChange={(e) => setDrugA(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label>Drug B</label>
          <input
            type="text"
            placeholder="e.g., Ibuprofen"
            value={drugB}
            onChange={(e) => setDrugB(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label>Patient Age (optional)</label>
          <input
            type="number"
            placeholder="e.g., 72"
            value={patientAge}
            onChange={(e) => setPatientAge(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label>Patient Conditions (optional)</label>
          <input
            type="text"
            placeholder="e.g., hypertension, chronic pain"
            value={patientConditions}
            onChange={(e) => setPatientConditions(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={loading}
          className="check-button"
        >
          {loading ? 'Checking...' : 'Check Combination'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="results-section">
          <div className={`risk-flag ${result.risk_level}`}>
            <h2>{result.risk_level === 'elevated' ? '⚠️ ELEVATED RISK' : '✓ No Notable Signal'}</h2>
            <p>{result.total_reports} reports in FAERS for {result.drug_a} + {result.drug_b}</p>
          </div>

          {Object.keys(result.elevated_reactions).length > 0 && (
            <div className="reactions-section">
              <h3>Top Reactions (Elevated Signal)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Reaction</th>
                    <th>Count</th>
                    <th>PRR</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.elevated_reactions).map(([reaction, data]) => (
                    <tr key={reaction}>
                      <td>{reaction}</td>
                      <td>{data.count}</td>
                      <td>{data.prr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="narrative-section">
            <h3>What Patients Reported (Claude Summary)</h3>
            <p className="narrative-text">{result.narrative_summary}</p>
            <p className="source">Source: FAERS adverse event narratives, summarized with Claude</p>
          </div>

          {result.patient_similarity && (
            <div className="similarity-section">
              <h3>Patient Similarity Analysis</h3>
              <p className="similarity-text">{result.patient_similarity}</p>
            </div>
          )}

          <div className="note-section">
            <h3>Generated Clinical Note</h3>
            <div className="note-box">
              <p>{result.generated_note}</p>
            </div>
            <button
              onClick={() => copyToClipboard(result.generated_note)}
              className="copy-button"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
