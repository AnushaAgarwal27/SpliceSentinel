import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'

export default function HistoricalTrends({ drug_a, drug_b }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`/api/combo-history/${drug_a}/${drug_b}?limit=30`)
        setHistory(response.data.history || [])
        setError(null)
      } catch (err) {
        console.error('Error fetching history:', err)
        setError('Failed to load historical trends')
      } finally {
        setLoading(false)
      }
    }

    if (drug_a && drug_b) {
      fetchHistory()
    }
  }, [drug_a, drug_b])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-slate-800/30 border border-slate-700 p-8 text-center"
      >
        <p className="text-slate-400">⏳ Loading historical trends...</p>
      </motion.div>
    )
  }

  if (error || history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-slate-800/30 border border-slate-700 p-8 text-center"
      >
        <p className="text-slate-400">
          {error || 'No historical data yet. This is the first check for this combination.'}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Report Volume Trend */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm border border-slate-600/50 p-8">
        <h3 className="text-xl font-bold text-white mb-2">📈 Report Volume Trend</h3>
        <p className="text-sm text-slate-300 mb-6">
          How the number of adverse event reports has changed over time. Rising = more cases being reported.
        </p>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={history}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            style={{ background: 'rgba(51, 65, 85, 0.3)' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{
                value: 'Reports',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
              formatter={(value) => [value.toLocaleString(), 'Reports']}
            />
            <Line
              type="monotone"
              dataKey="reports"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ fill: '#06b6d4', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* PRR Trend */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm border border-slate-600/50 p-8">
        <h3 className="text-xl font-bold text-white mb-2">⚠️ PRR Trend Over Time</h3>
        <p className="text-sm text-slate-300 mb-6">
          How the strongest PRR signal has evolved. Rising above 2.0 = worsening safety signal.
        </p>

        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart
            data={history}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            style={{ background: 'rgba(51, 65, 85, 0.3)' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{
                value: 'PRR',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
              formatter={(value) => [value.toFixed(2), 'Top PRR']}
            />
            <Legend />

            {/* Background zone for PRR >= 2 */}
            <Bar
              dataKey="threshold"
              fill="#ef4444"
              opacity={0.1}
              isAnimationActive={false}
            />

            {/* Actual PRR line */}
            <Line
              type="monotone"
              dataKey="top_prr"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ fill: '#f97316', r: 4 }}
              activeDot={{ r: 6 }}
              name="Top PRR"
            />

            {/* Threshold line */}
            <Line
              type="stepAfter"
              dataKey={() => 2}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="Signal Threshold"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Signal Count Evolution */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm border border-slate-600/50 p-8">
        <h3 className="text-xl font-bold text-white mb-2">🚨 Elevated Signals Over Time</h3>
        <p className="text-sm text-slate-300 mb-6">
          How many reactions met the elevated signal threshold (PRR ≥ 2) at each check.
        </p>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={history}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            style={{ background: 'rgba(51, 65, 85, 0.3)' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{
                value: 'Count',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
              formatter={(value) => [value, 'Signals']}
            />
            <Bar
              dataKey="signal_count"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 p-6"
      >
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-indigo-300">💡 Trend Interpretation:</span>
          {' '}
          {history.length} data points. {history[history.length - 1].top_prr >= 2 ? '🔴 Current signal is elevated' : '🟢 Current signal is normal'}.
          {history[history.length - 1].top_prr > (history[0]?.top_prr || 0) ? ' Worsening trend detected.' : ' Stable or improving.'}
        </p>
      </motion.div>
    </motion.div>
  )
}
