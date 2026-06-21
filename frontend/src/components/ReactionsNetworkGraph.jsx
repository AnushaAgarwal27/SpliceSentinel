import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ForceGraph2D from 'react-force-graph-2d'
import { Network, Maximize2, Minimize2, MousePointer2 } from 'lucide-react'

const DEFAULT_VISIBLE_REACTIONS = 15

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const formatNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}

const getMaxPRR = (signal) => Math.max(
  Number(signal.prr_vs_drug_a) || 0,
  Number(signal.prr_vs_drug_b) || 0
)

export default function ReactionsNetworkGraph({ results }) {
  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const [showAll, setShowAll] = useState(false)
  const [hoverNode, setHoverNode] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [graphWidth, setGraphWidth] = useState(1060)
  const [searchTerm, setSearchTerm] = useState('')
  const activeNode = hoverNode || selectedNode

  const signals = results?.signals || []
  const visibleSignals = useMemo(() => {
    return [...signals]
      .sort((a, b) => {
        const prrDelta = getMaxPRR(b) - getMaxPRR(a)
        return prrDelta !== 0 ? prrDelta : (b.combo_count || 0) - (a.combo_count || 0)
      })
      .slice(0, showAll ? signals.length : DEFAULT_VISIBLE_REACTIONS)
  }, [signals, showAll])

  const graphData = useMemo(() => {
    if (!results || visibleSignals.length === 0) {
      return { nodes: [], links: [] }
    }

    const drugAId = `drug:${results.drug_a}:a`
    const drugBId = `drug:${results.drug_b}:b`
    const maxCount = Math.max(...visibleSignals.map(signal => signal.combo_count || 0), 1)
    const maxStrength = Math.max(...visibleSignals.map(getMaxPRR), 1)

    const nodes = [
      {
        id: drugAId,
        name: results.drug_a,
        type: 'drug',
        count: results.combo_total,
        prr: null,
        val: 15,
        fx: -48,
        fy: 0,
      },
      {
        id: drugBId,
        name: results.drug_b,
        type: 'drug',
        count: results.combo_total,
        prr: null,
        val: 15,
        fx: 48,
        fy: 0,
      },
    ]

    const links = []

    visibleSignals.forEach((signal, index) => {
      const maxPRR = getMaxPRR(signal)
      const reactionId = `reaction:${signal.reaction}:${index}`
      const isElevated = maxPRR >= 2
      const reactionValue = 6 + clamp(Math.sqrt((signal.combo_count || 0) / maxCount) * 11, 2, 11)

      nodes.push({
        id: reactionId,
        name: signal.reaction,
        type: 'reaction',
        count: signal.combo_count || 0,
        rate: signal.rate_in_combo,
        prrA: Number(signal.prr_vs_drug_a) || 0,
        prrB: Number(signal.prr_vs_drug_b) || 0,
        prr: maxPRR,
        elevated: isElevated,
        val: reactionValue,
      })

      const addLink = (source, prrValue) => {
        const boundedPRR = Math.min(Number(prrValue) || 0, maxStrength)
        const countWeight = Math.sqrt((signal.combo_count || 0) / maxCount)
        const prrWeight = Math.sqrt(boundedPRR / maxStrength)
        const strength = clamp((countWeight + prrWeight) / 2, 0.1, 1)

        links.push({
          source,
          target: reactionId,
          value: strength,
          prr: Number(prrValue) || 0,
          count: signal.combo_count || 0,
        })
      }

      addLink(drugAId, signal.prr_vs_drug_a)
      addLink(drugBId, signal.prr_vs_drug_b)
    })

    return { nodes, links }
  }, [results, visibleSignals])

  const searchedNode = useMemo(() => {
    if (!searchTerm.trim()) return null
    const found = visibleSignals.find(s => s.reaction.toLowerCase().includes(searchTerm.toLowerCase()))
    return found || null
  }, [searchTerm, visibleSignals])

  const neighborIds = useMemo(() => {
    if (!selectedNode) return new Set()

    const ids = new Set([selectedNode.id])
    graphData.links.forEach((link) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      if (sourceId === selectedNode.id) ids.add(targetId)
      if (targetId === selectedNode.id) ids.add(sourceId)
    })
    return ids
  }, [graphData.links, selectedNode])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const observer = new ResizeObserver(([entry]) => {
      setGraphWidth(Math.max(320, Math.floor(entry.contentRect.width)))
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    graph.d3Force('link')?.distance((link) => 220 - link.value * 80)
    graph.d3Force('charge')?.strength(-360)
    graph.d3Force('center')?.strength?.(0.06)
  }, [graphData])

  useEffect(() => {
    if (searchedNode && graphRef.current) {
      const foundNode = graphData.nodes.find(n => n.name === searchedNode.reaction && n.type === 'reaction')
      if (foundNode) {
        graphRef.current.centerAt?.(foundNode.x, foundNode.y, 500)
        graphRef.current.zoom?.(2.2, 500)
      }
    }
  }, [searchedNode, graphData.nodes])

  if (!results) return null

  if (signals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl bg-card-dark backdrop-blur-sm border border-teal-deep/30 p-8"
      >
        <h3 className="text-2xl font-bold text-text-off-white">Reaction Association Network</h3>
        <p className="text-sm text-text-warm-gray mt-2">No reaction signals were returned for this combination.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl bg-card-dark border border-teal-deep/30 p-6 md:p-8"
    >
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Network size={24} className="text-gold-muted" />
            <h3 className="text-2xl font-bold text-text-off-white">Reaction Association Network</h3>
          </div>
          <p className="text-xs text-text-warm-gray mt-2 max-w-2xl">
            Node size follows report count; edge weight follows existing PRR/report-count strength. Hover for details, click to pin direct connections.
          </p>
        </div>

        {signals.length > DEFAULT_VISIBLE_REACTIONS && (
          <button
            type="button"
            onClick={() => {
              setShowAll(prev => !prev)
              setSelectedNode(null)
              graphRef.current?.zoomToFit?.(500, 48)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold-muted/40 bg-gold-muted/10 px-4 py-2 text-sm font-semibold text-gold-muted transition hover:bg-gold-muted/20"
          >
            {showAll ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {showAll ? `Show Top ${DEFAULT_VISIBLE_REACTIONS}` : `Show All ${signals.length}`}
          </button>
        )}
      </div>

      <div className="mb-4 space-y-3">
        <input
          type="text"
          placeholder="Search symptom..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-teal-deep/30 bg-bg-dark px-3 py-2 text-sm text-text-off-white placeholder-text-warm-gray/50 focus:border-teal-deep focus:outline-none"
        />
        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-lg border border-teal-deep/30 bg-bg-dark/35 px-3 py-2 text-text-warm-gray">
            <span className="font-semibold text-[#7FA88C]">Teal</span> drug nodes
          </div>
          <div className="rounded-lg border border-teal-deep/30 bg-bg-dark/35 px-3 py-2 text-text-warm-gray">
            <span className="font-semibold text-[#E8A547]">Orange</span> reaction nodes
          </div>
          <div className="rounded-lg border border-teal-deep/30 bg-bg-dark/35 px-3 py-2 text-text-warm-gray">
            <span className="font-semibold text-[#FF6B6B]">Red ring</span> PRR ≥ 2
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-[560px] overflow-hidden rounded-lg border border-teal-deep/25 bg-[linear-gradient(180deg,rgba(20,20,26,0.96),rgba(12,13,15,0.98))]"
      >
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-teal-deep/30 bg-bg-dark/70 px-3 py-2 text-xs text-text-warm-gray shadow-xl backdrop-blur">
          <MousePointer2 size={14} className="text-[#E8A547]" />
          Hover a node for data
        </div>

        {activeNode && (
          <div className="pointer-events-none absolute right-4 top-4 z-10 w-[min(320px,calc(100%-2rem))] rounded-lg border border-teal-deep/40 bg-card-dark/95 p-4 shadow-2xl shadow-bg-dark/50 backdrop-blur">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-warm-gray">
                  {activeNode.type === 'drug' ? 'Drug node' : activeNode.elevated ? '⚠️ High-risk reaction (PRR ≥ 2)' : 'Standard reaction'}
                </p>
                <h4 className="mt-1 text-base font-bold leading-tight text-text-off-white">{activeNode.name}</h4>
              </div>
              <span className={`mt-1 h-3 w-3 flex-none rounded-full ${activeNode.type === 'drug' ? 'bg-teal-deep ring-2 ring-[#7FA88C]/60' : activeNode.elevated ? 'bg-[#E8A547] ring-2 ring-[#FF6B6B]/70' : 'bg-[#8F784F] ring-2 ring-[#E8A547]/40'}`} />
            </div>
            {activeNode.type === 'drug' ? (
              <p className="text-sm text-text-warm-gray">
                {Number(activeNode.count || 0).toLocaleString()} combination reports
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded border border-teal-deep/30 bg-bg-dark/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-text-warm-gray">Reports</p>
                  <p className="mt-1 font-bold text-text-off-white">{Number(activeNode.count || 0).toLocaleString()}</p>
                </div>
                <div className="rounded border border-teal-deep/30 bg-bg-dark/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-text-warm-gray">Rate</p>
                  <p className="mt-1 font-bold text-text-off-white">{formatNumber(activeNode.rate)}%</p>
                </div>
                <div className="rounded border border-teal-deep/30 bg-bg-dark/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-text-warm-gray">PRR vs {results.drug_a}</p>
                  <p className="mt-1 font-bold text-[#FF6B6B]">{formatNumber(activeNode.prrA)}x</p>
                </div>
                <div className="rounded border border-teal-deep/30 bg-bg-dark/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-text-warm-gray">PRR vs {results.drug_b}</p>
                  <p className="mt-1 font-bold text-[#FF6B6B]">{formatNumber(activeNode.prrB)}x</p>
                </div>
              </div>
            )}
          </div>
        )}

        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={graphWidth}
          height={560}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTicks={140}
          onEngineStop={() => graphRef.current?.zoomToFit?.(600, 74)}
          d3VelocityDecay={0.22}
          dagMode={null}
          linkDirectionalParticles={(link) => link.prr >= 2 ? 1 : 0}
          linkDirectionalParticleWidth={(link) => 0.7 + link.value * 1.4}
          linkDirectionalParticleSpeed={0.004}
          linkColor={(link) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source
            const targetId = typeof link.target === 'object' ? link.target.id : link.target
            if (selectedNode && !neighborIds.has(sourceId) && !neighborIds.has(targetId)) return 'rgba(127,168,140,0.06)'
            if (hoverNode && sourceId !== hoverNode.id && targetId !== hoverNode.id) return 'rgba(127,168,140,0.12)'
            return link.prr >= 2 ? 'rgba(185,155,98,0.48)' : 'rgba(127,168,140,0.28)'
          }}
          linkWidth={(link) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source
            const targetId = typeof link.target === 'object' ? link.target.id : link.target
            const selectedActive = !selectedNode || (neighborIds.has(sourceId) && neighborIds.has(targetId))
            const hoverActive = !hoverNode || sourceId === hoverNode.id || targetId === hoverNode.id
            return selectedActive && hoverActive ? 0.8 + link.value * 4.2 : 0.35
          }}
          nodeRelSize={1}
          nodeVal={(node) => node.val}
          nodeLabel={(node) => {
            if (node.type === 'drug') {
              return `<div><strong>${node.name}</strong><br/>Combination reports: ${node.count}</div>`
            }
            return `<div><strong>${node.name}</strong><br/>Reports: ${node.count}<br/>Rate: ${formatNumber(node.rate)}%<br/>PRR vs ${results.drug_a}: ${formatNumber(node.prrA)}<br/>PRR vs ${results.drug_b}: ${formatNumber(node.prrB)}</div>`
          }}
          onNodeHover={setHoverNode}
          onNodeClick={(node) => {
            setSelectedNode(prev => prev?.id === node.id ? null : node)
            graphRef.current?.centerAt?.(node.x, node.y, 500)
            graphRef.current?.zoom?.(2.2, 500)
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isActive = !selectedNode || neighborIds.has(node.id)
            const isHovered = hoverNode?.id === node.id
            const isSelected = selectedNode?.id === node.id
            const radius = node.val
            const shouldLabel = node.type === 'drug' || isHovered || isSelected
            const fontSize = clamp((node.type === 'drug' ? 13 : 12) / globalScale, 3.2, 6)

            ctx.globalAlpha = isActive ? 1 : 0.18

            if (node.elevated || isHovered || isSelected) {
              ctx.beginPath()
              ctx.arc(node.x, node.y, radius + (node.elevated ? 5 : 4), 0, 2 * Math.PI, false)
              ctx.fillStyle = node.elevated ? 'rgba(215,187,118,0.12)' : 'rgba(127,168,140,0.10)'
              ctx.fill()
            }

            ctx.beginPath()
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
            ctx.fillStyle = node.type === 'drug' ? '#0F4C45' : node.elevated ? '#FF6B6B' : '#E8A547'
            ctx.fill()
            ctx.lineWidth = node.elevated ? 3.2 : 1.8
            ctx.strokeStyle = node.elevated ? '#FF4444' : node.type === 'drug' ? '#7FA88C' : '#E8A547'
            ctx.stroke()

            if (isHovered || isSelected) {
              ctx.beginPath()
              ctx.arc(node.x, node.y, radius + 7, 0, 2 * Math.PI, false)
              ctx.lineWidth = 2
              ctx.strokeStyle = '#FF6B6B'
              ctx.stroke()
            }

            if (shouldLabel) {
              const maxLabelLength = node.type === 'drug' ? 18 : 30
              const displayLabel = node.name.length > maxLabelLength ? `${node.name.slice(0, maxLabelLength - 1)}...` : node.name
              ctx.font = `${node.type === 'drug' ? 700 : 600} ${fontSize}px Inter, system-ui, sans-serif`
              const labelWidth = ctx.measureText(displayLabel).width + 12
              const labelY = node.y + radius + 8

              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = 'rgba(20,20,26,0.88)'
              ctx.strokeStyle = node.type === 'drug' ? 'rgba(127,168,140,0.35)' : 'rgba(185,155,98,0.35)'
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.roundRect(node.x - labelWidth / 2, labelY - 8, labelWidth, 16, 5)
              ctx.fill()
              ctx.stroke()
              ctx.fillStyle = '#F8F6F1'
              ctx.fillText(displayLabel, node.x, labelY)
            }
            ctx.globalAlpha = 1
          }}
        />
      </div>
    </motion.div>
  )
}
