import { motion } from 'framer-motion'
import { RefreshCw, BarChart3, Users, FileText, PenLine, CheckCircle2 } from 'lucide-react'

export default function QueryProgress({ progress }) {
  const stages = [
    { id: 'querying', label: 'Querying openFDA', Icon: RefreshCw },
    { id: 'signals', label: 'Calculating signals', Icon: BarChart3 },
    { id: 'similar', label: 'Finding similar cases', Icon: Users },
    { id: 'narrative', label: 'Generating summaries', Icon: FileText },
    { id: 'note', label: 'Finalizing report', Icon: PenLine },
    { id: 'complete', label: 'Complete', Icon: CheckCircle2 },
  ]

  const currentIndex = stages.findIndex(s => s.id === progress.stage)
  const completedSteps = currentIndex
  const progressPercent = (completedSteps / stages.length) * 100

  const getStepState = (index) => {
    if (index < currentIndex) return 'DONE'
    if (index === currentIndex) return 'ACTIVE'
    return 'PENDING'
  }

  const getIconColor = (state) => {
    if (state === 'DONE') return '#7FA88C'
    if (state === 'ACTIVE') return '#C9A35C'
    return '#9CA3AF'
  }

  const getIconOpacity = (state) => {
    if (state === 'PENDING') return 0.3
    return 1
  }

  const getLabelColor = (state) => {
    if (state === 'PENDING') return 'text-text-warm-gray/60'
    return 'text-text-off-white'
  }

  const getLabelWeight = (state) => {
    if (state === 'ACTIVE') return 'font-bold'
    return 'font-semibold'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-card-dark rounded-xl shadow-lg p-8 mb-8 border border-teal-deep/30"
    >
      <h3 className="text-xl font-serif font-light text-text-off-white mb-8">Analyzing Data...</h3>

      <div className="space-y-4">
        {stages.map((stage, index) => {
          const state = getStepState(index)
          const { Icon } = stage
          const iconColor = getIconColor(state)
          const iconOpacity = getIconOpacity(state)
          const labelColor = getLabelColor(state)
          const labelWeight = getLabelWeight(state)

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4"
            >
              {/* Icon Container */}
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {state === 'DONE' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle2
                      size={20}
                      color={iconColor}
                      opacity={iconOpacity}
                      strokeWidth={2.5}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={state === 'ACTIVE' ? { scale: [1, 1.05, 1] } : {}}
                    transition={state === 'ACTIVE' ? { duration: 1.5, repeat: Infinity } : {}}
                  >
                    <Icon
                      size={20}
                      color={iconColor}
                      opacity={iconOpacity}
                      strokeWidth={2}
                    />
                  </motion.div>
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p className={`${labelWeight} ${labelColor} transition-colors duration-300`}>
                  {stage.label}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <motion.div
        className="mt-8 bg-text-warm-gray/10 rounded-full h-2 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-teal-deep to-gold-muted"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  )
}
