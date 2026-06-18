import NodeCard from './NodeCard.jsx'

// writer -> full report appears in ReportPanel below.
// critic / memory_write -> docked in the left sidebar, not the center feed.
const SKIP_NODES = new Set(['writer', 'critic', 'memory_write'])

export default function EventFeed({ events }) {
  const visible = events.filter(e => !SKIP_NODES.has(e.node))
  if (visible.length === 0) return null

  return (
    <div className="space-y-4">
      {visible.map(event => (
        <NodeCard key={event.id} event={event} />
      ))}
    </div>
  )
}
