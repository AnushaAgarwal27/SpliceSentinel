import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './App.css';

const DEFAULT_VISIBLE_REACTIONS = 20;

const getReactionPRR = (data) => Number(data?.prr) || 0;
const getReactionCount = (data) => Number(data?.count) || 0;

function ReactionsNetworkGraph({ result }) {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [showAll, setShowAll] = useState(false);
  const [hoverNode, setHoverNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphWidth, setGraphWidth] = useState(820);
  const activeNode = hoverNode || selectedNode;

  const reactions = useMemo(() => Object.entries(result.elevated_reactions || {}), [result.elevated_reactions]);
  const visibleReactions = useMemo(() => {
    return [...reactions]
      .sort(([, a], [, b]) => {
        const prrDelta = getReactionPRR(b) - getReactionPRR(a);
        return prrDelta !== 0 ? prrDelta : getReactionCount(b) - getReactionCount(a);
      })
      .slice(0, showAll ? reactions.length : DEFAULT_VISIBLE_REACTIONS);
  }, [reactions, showAll]);

  const graphData = useMemo(() => {
    const maxCount = Math.max(...visibleReactions.map(([, data]) => getReactionCount(data)), 1);
    const maxPRR = Math.max(...visibleReactions.map(([, data]) => getReactionPRR(data)), 1);
    const drugAId = `drug:${result.drug_a}:a`;
    const drugBId = `drug:${result.drug_b}:b`;

    const nodes = [
      {
        id: drugAId,
        name: result.drug_a,
        type: 'drug',
        count: result.total_reports,
        val: 15,
        fx: -48,
        fy: 0,
      },
      {
        id: drugBId,
        name: result.drug_b,
        type: 'drug',
        count: result.total_reports,
        val: 15,
        fx: 48,
        fy: 0,
      },
    ];
    const links = [];

    visibleReactions.forEach(([reaction, data], index) => {
      const count = getReactionCount(data);
      const prr = getReactionPRR(data);
      const strength = Math.max(0.12, ((Math.sqrt(count / maxCount) + Math.sqrt(Math.min(prr, maxPRR) / maxPRR)) / 2));
      const reactionId = `reaction:${reaction}:${index}`;

      nodes.push({
        id: reactionId,
        name: reaction,
        type: 'reaction',
        count,
        prr,
        elevated: prr >= 2,
        val: 6 + Math.sqrt(count / maxCount) * 11,
      });

      links.push(
        { source: drugAId, target: reactionId, value: strength, prr, count },
        { source: drugBId, target: reactionId, value: strength, prr, count }
      );
    });

    return { nodes, links };
  }, [result, visibleReactions]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set();

    const ids = new Set([selectedNode.id]);
    graphData.links.forEach((link) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      if (sourceId === selectedNode.id) ids.add(targetId);
      if (targetId === selectedNode.id) ids.add(sourceId);
    });
    return ids;
  }, [graphData.links, selectedNode]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setGraphWidth(Math.max(320, Math.floor(containerRef.current.clientWidth)));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    graph.d3Force('link')?.distance((link) => 220 - link.value * 80);
    graph.d3Force('charge')?.strength(-360);
    graph.d3Force('center')?.strength?.(0.06);
  }, [graphData]);

  return (
    <div className="reactions-network">
      <div className="network-header">
        <div>
          <h3>Reaction Association Network</h3>
          <p>Hover for count/PRR details. Click a node to isolate its direct connections.</p>
        </div>
        {reactions.length > DEFAULT_VISIBLE_REACTIONS && (
          <button
            type="button"
            className="network-toggle"
            onClick={() => {
              setShowAll((current) => !current);
              setSelectedNode(null);
              graphRef.current?.zoomToFit?.(500, 40);
            }}
          >
            {showAll ? `Show Top ${DEFAULT_VISIBLE_REACTIONS}` : `Show All ${reactions.length}`}
          </button>
        )}
      </div>

      <div className="network-legend">
        <span><b className="legend-drug" /> Drug</span>
        <span><b className="legend-reaction" /> Reaction</span>
        <span><b className="legend-signal" /> PRR >= 2</span>
      </div>

      <div ref={containerRef} className="network-canvas">
        {activeNode && (
          <div className="network-tooltip">
            <div className="network-tooltip-kind">
              {activeNode.type === 'drug' ? 'Drug node' : activeNode.elevated ? 'Elevated reaction' : 'Reaction'}
            </div>
            <div className="network-tooltip-title">{activeNode.name}</div>
            {activeNode.type === 'drug' ? (
              <div className="network-tooltip-row">Combination reports: {Number(activeNode.count || 0).toLocaleString()}</div>
            ) : (
              <>
                <div className="network-tooltip-row">Reports: {Number(activeNode.count || 0).toLocaleString()}</div>
                <div className="network-tooltip-row">PRR: {activeNode.prr.toFixed(2)}x</div>
              </>
            )}
          </div>
        )}
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={graphWidth}
          height={540}
          backgroundColor="#0A0A0B"
          cooldownTicks={140}
          d3VelocityDecay={0.32}
          onEngineStop={() => graphRef.current?.zoomToFit?.(600, 74)}
          linkColor={(link) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            if (selectedNode && !connectedNodeIds.has(sourceId) && !connectedNodeIds.has(targetId)) {
              return 'rgba(127,168,140,0.06)';
            }
            if (hoverNode && sourceId !== hoverNode.id && targetId !== hoverNode.id) return 'rgba(127,168,140,0.12)';
            return link.prr >= 2 ? 'rgba(201,163,92,0.58)' : 'rgba(127,168,140,0.32)';
          }}
          linkWidth={(link) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const selectedActive = !selectedNode || (connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId));
            const hoverActive = !hoverNode || sourceId === hoverNode.id || targetId === hoverNode.id;
            return selectedActive && hoverActive ? 0.8 + link.value * 4.2 : 0.35;
          }}
          linkDirectionalParticles={(link) => link.prr >= 2 ? 1 : 0}
          linkDirectionalParticleWidth={(link) => 0.7 + link.value * 1.4}
          linkDirectionalParticleSpeed={0.004}
          nodeVal={(node) => node.val}
          nodeLabel={(node) => (
            node.type === 'drug'
              ? `<strong>${node.name}</strong><br/>Combination reports: ${node.count}`
              : `<strong>${node.name}</strong><br/>Reports: ${node.count}<br/>PRR: ${node.prr.toFixed(2)}`
          )}
          onNodeHover={setHoverNode}
          onNodeClick={(node) => {
            setSelectedNode((current) => current?.id === node.id ? null : node);
            graphRef.current?.centerAt?.(node.x, node.y, 500);
            graphRef.current?.zoom?.(2.1, 500);
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const active = !selectedNode || connectedNodeIds.has(node.id);
            const isHovered = hoverNode?.id === node.id;
            const isSelected = selectedNode?.id === node.id;
            const radius = node.val;
            const shouldLabel = node.type === 'drug' || isHovered || isSelected;
            const fontSize = Math.max(3.5, (node.type === 'drug' ? 13 : 12) / globalScale);

            ctx.globalAlpha = active ? 1 : 0.18;
            if (node.elevated || isHovered || isSelected) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + (node.elevated ? 5 : 4), 0, 2 * Math.PI, false);
              ctx.fillStyle = node.elevated ? 'rgba(239,68,68,0.13)' : 'rgba(201,163,92,0.12)';
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.type === 'drug' ? '#0F4C45' : node.elevated ? '#C9A35C' : '#9F8550';
            ctx.fill();
            ctx.lineWidth = node.elevated ? 2.4 : 1.2;
            ctx.strokeStyle = node.elevated ? '#F87171' : node.type === 'drug' ? '#7FA88C' : '#D7BB76';
            ctx.stroke();

            if (isHovered || isSelected) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 7, 0, 2 * Math.PI, false);
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#F3D58A';
              ctx.stroke();
            }

            if (shouldLabel) {
              const maxLabelLength = node.type === 'drug' ? 18 : 30;
              const label = node.name.length > maxLabelLength ? `${node.name.slice(0, maxLabelLength - 1)}...` : node.name;
              ctx.font = `${node.type === 'drug' ? 700 : 600} ${fontSize}px system-ui, sans-serif`;
              const labelWidth = ctx.measureText(label).width + 12;
              const labelY = node.y + radius + 8;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'rgba(20,20,26,0.88)';
              ctx.strokeStyle = node.type === 'drug' ? 'rgba(127,168,140,0.35)' : 'rgba(201,163,92,0.35)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.roundRect(node.x - labelWidth / 2, labelY - 8, labelWidth, 16, 5);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#F8F6F1';
              ctx.fillText(label, node.x, labelY);
            }
            ctx.globalAlpha = 1;
          }}
        />
      </div>
    </div>
  );
}

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
      const response = await fetch('http://localhost:8000/check-combination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          drug_a: drugA,
          drug_b: drugB,
          ...(patientAge && { patient_age: parseInt(patientAge) }),
          ...(patientConditions && { patient_conditions: patientConditions })
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'API error');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`Failed to check combination: ${err.message}`);
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
            <ReactionsNetworkGraph result={result} />
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
