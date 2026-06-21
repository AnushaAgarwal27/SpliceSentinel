import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import HistoricalTrends from './HistoricalTrends'

export default function ChartsDashboard({ results }) {
  const [expandedChart, setExpandedChart] = useState(null)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const isLowConfidence = results.combo_total < 10

  // Update refresh time for live indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  if (isLowConfidence) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-8 mt-6"
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl">📊</div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Insufficient Data for Visualization</h3>
            <p className="text-slate-300 text-sm">
              Only {results.combo_total} adverse event report{results.combo_total !== 1 ? 's' : ''} found.
              Statistical charts require at least 10 reports for reliable visualization.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Prepare data for charts
  const signals = results.signals || []
  const topSignals = signals.slice(0, 10)

  // PRR Chart Data
  const prrChartData = topSignals.map(sig => ({
    reaction: sig.reaction.substring(0, 20),
    fullReaction: sig.reaction,
    prr: Math.round(Math.max(sig.prr_vs_drug_a, sig.prr_vs_drug_b) * 100) / 100,
    maxPRR: Math.max(sig.prr_vs_drug_a, sig.prr_vs_drug_b),
  }))

  // Reaction Frequency Data
  const frequencyChartData = topSignals.map(sig => ({
    reaction: sig.reaction.substring(0, 20),
    fullReaction: sig.reaction,
    count: sig.combo_count,
    rate: Math.round(sig.rate_in_combo * 100) / 100,
  }))

  const getPRRColor = (value) => {
    if (value >= 2) return '#ef4444'
    return '#9ca3af'
  }

  const ChartCard = ({ title, description, children, onToggleData, isExpanded, icon }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm border border-slate-600/50 p-8 hover:border-indigo-500/50 transition-all hover:shadow-lg"
    >
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-1">{icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-sm text-slate-300 mt-1">{description}</p>
            </div>
          </div>
          <button
            onClick={onToggleData}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-900/30 border border-indigo-500/30 px-3 py-1.5 rounded-lg whitespace-nowrap ml-4"
          >
            {isExpanded ? '▼ Hide' : '▶'} Data
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6 -mx-4">
        {children}
      </div>

      {/* Raw Data Expansion */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-slate-700"
          >
            {isExpanded === 'prr' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Top 10 Reactions by PRR
                </p>
                <div className="bg-slate-900/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {topSignals.map((sig, i) => (
                    <div key={i} className="text-xs text-slate-300 py-2 border-b border-slate-700 last:border-0">
                      <div className="font-semibold text-white">{i + 1}. {sig.reaction}</div>
                      <div className="text-slate-400 mt-1">
                        Count: {sig.combo_count} | Rate: {sig.rate_in_combo}% | PRR (vs A): {sig.prr_vs_drug_a}× | PRR (vs B): {sig.prr_vs_drug_b}×
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isExpanded === 'frequency' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Report Counts by Reaction
                </p>
                <div className="bg-slate-900/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {frequencyChartData.map((item, i) => (
                    <div key={i} className="text-xs text-slate-300 py-2 border-b border-slate-700 last:border-0">
                      <div className="font-semibold text-white">{i + 1}. {item.fullReaction}</div>
                      <div className="text-slate-400 mt-1">
                        Reports: {item.count} | Rate: {item.rate}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  return (
    <div className="space-y-8 mt-8">
      {/* PRR Bar Chart */}
      <ChartCard
        title="Disproportionality Score (PRR)"
        description="PRR ≥ 2 means this reaction was reported at least twice as often with this combination compared to either drug alone. Red = elevated signal."
        icon="⚠️"
        onToggleData={() =>
          setExpandedChart(expandedChart === 'prr' ? null : 'prr')
        }
        isExpanded={expandedChart === 'prr'}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={prrChartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            style={{ background: 'rgba(51, 65, 85, 0.3)' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.5} />
            <XAxis
              dataKey="reaction"
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
              formatter={(value) => [value.toFixed(2), 'PRR']}
              cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
            />
            <ReferenceLine
              y={2}
              stroke="#f97316"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: 'Signal Threshold',
                position: 'insideTopRight',
                fill: '#f97316',
                fontSize: 11,
                offset: 10,
              }}
            />
            <Bar dataKey="prr" fill="#ef4444" radius={[4, 4, 0, 0]}>
              {prrChartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.maxPRR >= 2 ? '#ef4444' : '#64748b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Reaction Frequency Chart */}
      <ChartCard
        title="Reaction Frequency"
        description="Raw count of adverse event reports for each reaction. Higher = more frequently reported in this combination."
        icon="📊"
        onToggleData={() =>
          setExpandedChart(expandedChart === 'frequency' ? null : 'frequency')
        }
        isExpanded={expandedChart === 'frequency'}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={frequencyChartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            style={{ background: 'rgba(51, 65, 85, 0.3)' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.5} />
            <XAxis
              dataKey="reaction"
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
              formatter={(value) => [value, 'Reports']}
              cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
            />
            <Bar
              dataKey="count"
              fill="#a78bfa"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm border border-slate-600/50 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Data Summary</h3>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-400">Live data from FDA</span>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-indigo-900/30 to-indigo-900/10 rounded-xl p-5 border border-indigo-500/30 hover:border-indigo-500/50 transition-colors"
          >
            <div className="text-3xl font-bold text-indigo-400 mb-2">
              {results.combo_total.toLocaleString()}
            </div>
            <p className="text-sm text-slate-300">Total Reports</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 rounded-xl p-5 border border-purple-500/30 hover:border-purple-500/50 transition-colors"
          >
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {signals.length}
            </div>
            <p className="text-sm text-slate-300">Reactions</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-red-900/30 to-red-900/10 rounded-xl p-5 border border-red-500/30 hover:border-red-500/50 transition-colors"
          >
            <div className="text-3xl font-bold text-red-400 mb-2">
              {signals.filter(s => Math.max(s.prr_vs_drug_a, s.prr_vs_drug_b) >= 2).length}
            </div>
            <p className="text-sm text-slate-300">Signals ≥ 2 PRR</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-orange-900/30 to-orange-900/10 rounded-xl p-5 border border-orange-500/30 hover:border-orange-500/50 transition-colors"
          >
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {signals.length > 0
                ? (results.combo_total / signals.length).toFixed(1)
                : '0'}
            </div>
            <p className="text-sm text-slate-300">Avg/Reaction</p>
          </motion.div>
        </div>

        {/* Data Source Info */}
        <div className="mt-6 pt-6 border-t border-slate-600/50">
          <p className="text-xs text-slate-400">
            📊 <span className="font-semibold">Data Source:</span> FDA FAERS database queried via openFDA API •
            <span className="font-semibold"> Last updated:</span> {refreshTime.toLocaleTimeString()}
          </p>
        </div>
      </motion.div>

      {/* Historical Trends Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-12 pt-8 border-t border-slate-700"
      >
        <h2 className="text-2xl font-bold text-white mb-2">📊 Historical Trends</h2>
        <p className="text-slate-300 mb-8">
          How this drug combination's safety signals have evolved over time. Red zone = elevated PRR.
        </p>
        <HistoricalTrends drug_a={results.drug_a} drug_b={results.drug_b} />
      </motion.div>
    </div>
  )
}
