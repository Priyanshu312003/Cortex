import NodeCard from './NodeCard.jsx'

// writer events are omitted here - the full report appears in ReportPanel below
const SKIP_NODES = new Set(['writer'])

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
