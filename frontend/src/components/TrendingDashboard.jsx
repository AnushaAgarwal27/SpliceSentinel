import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'

export default function TrendingDashboard() {
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/trending-signals')
        setTrending(response.data.trending || [])
        setLastUpdate(new Date())
        setError(null)
      } catch (err) {
        console.error('Error fetching trending signals:', err)
        setError('Failed to load trending signals')
      } finally {
        setLoading(false)
      }
    }

    fetchTrending()

    // Refresh every 30 seconds
    const interval = setInterval(fetchTrending, 30000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-red-500/10 border border-red-500/50 p-6"
      >
        <p className="text-red-400">⚠️ {error}</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">📊 Live Trending Signals</h2>
          <p className="text-slate-400 text-sm mt-1">
            Most frequently checked drug combinations by doctors
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-slate-400">
            {lastUpdate ? `Updated ${Math.floor((Date.now() - lastUpdate) / 1000)}s ago` : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Trending Cards */}
      {loading && trending.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-slate-800/30 border border-slate-700 p-8 text-center"
        >
          <p className="text-slate-400">⏳ Loading trending signals...</p>
        </motion.div>
      ) : trending.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-slate-800/30 border border-slate-700 p-8 text-center"
        >
          <p className="text-slate-400">No data yet. Run some drug checks to see trending signals!</p>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {trending.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm border border-slate-600/50 p-6 hover:border-indigo-500/50 transition-all"
            >
              <div className="grid md:grid-cols-5 gap-4 items-center">
                {/* Rank Badge */}
                <div className="text-center md:text-left">
                  <div className="text-3xl font-bold text-indigo-400">#{index + 1}</div>
                  <p className="text-xs text-slate-400 mt-1">{item.check_count} checks</p>
                </div>

                {/* Drug Combo */}
                <div>
                  <h3 className="font-bold text-white">{item.combo}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Top: <span className="text-slate-300">{item.top_reaction}</span>
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-400">Reports</p>
                    <p className="font-bold text-cyan-400">{item.latest_reports.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-400">Signals ≥ 2</p>
                    <p className="font-bold text-orange-400">{item.elevated_signals}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-400">Top PRR</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-red-400">{item.top_prr.toFixed(1)}×</p>
                      {item.prr_trend !== 0 && (
                        <span className={`text-xs font-bold ${item.prr_trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {item.prr_trend > 0 ? '↑' : '↓'} {Math.abs(item.prr_trend).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Badge */}
              <div className="mt-4 pt-4 border-t border-slate-600/30 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Last checked: {new Date(item.last_checked).toLocaleTimeString()}
                </p>
                <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-3 py-1 rounded-lg">
                  View Details →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 p-6"
      >
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-indigo-300">💡 How this works:</span> Every time a doctor checks a drug combination,
          we store the result. Signals that appear frequently or worsen over time are flagged as trending. This helps identify
          emerging safety issues in real-time.
        </p>
      </motion.div>
    </div>
  )
}
