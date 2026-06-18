import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  CaretDown,
  Database,
  ListDashes,
  MagnifyingGlass,
  Star,
  CloudArrowUp,
  ArrowClockwise,
} from '@phosphor-icons/react'

function MemoryCard({ update }) {
  const hasPast = update.past_context?.trim()
  return (
    <p className="text-sm text-ink-2">
      {hasPast
        ? 'Retrieved relevant context from a previous run.'
        : 'No prior context found. Starting fresh.'}
    </p>
  )
}

function OrchestrateCard({ update }) {
  const tasks = update.tasks ?? []
  return (
    <ol className="space-y-2">
      {tasks.map((task, i) => (
        <li key={i} className="flex gap-3 text-sm text-ink-2">
          <span className="shrink-0 grid place-items-center w-5 h-5 rounded-md bg-accent-soft font-mono text-[11px] font-medium text-accent">
            {i + 1}
          </span>
          <span className="pt-px">{task.replace(/^\d+\.\s*/, '')}</span>
        </li>
      ))}
    </ol>
  )
}

function ResearcherCard({ update }) {
  const reduce = useReducedMotion()
  const [expanded, setExpanded] = useState(false) // default collapsed
  const text = (update.research ?? '').trim()
  const wordCount = text ? text.split(/\s+/).length : 0

  return (
    <div>
      <button
        onClick={() => setExpanded(x => !x)}
        className="group flex w-full items-center gap-2 text-sm text-ink-2 transition-colors hover:text-ink"
      >
        <span>Searched the web and summarized findings</span>
        <span className="font-mono text-xs text-ink-3 tabular-nums">{wordCount} words</span>
        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-accent">
          {expanded ? 'Collapse' : 'Expand'}
          <motion.span
            animate={reduce ? undefined : { rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <CaretDown size={12} weight="bold" />
          </motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="mt-3 rounded-lg border border-line bg-inset px-4 py-3 text-sm leading-relaxed text-ink-2 whitespace-pre-wrap">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Score + status badge only. Critic FEEDBACK lives solely in the Final Report header.
function CriticCard({ update, isRetry }) {
  const { critic_score } = update
  const passed = critic_score >= 7

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold font-mono tabular-nums text-accent leading-none">
          {critic_score}
        </span>
        <span className="text-ink-3 text-sm">/10</span>
      </div>
      {!passed && !isRetry && (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent-ring bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
          <ArrowClockwise size={11} weight="bold" />
          Below threshold, retrying
        </span>
      )}
      {passed && (
        <span className="rounded-full border border-accent-ring bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
          {isRetry ? 'Passed on retry' : 'Passed'}
        </span>
      )}
      {!passed && isRetry && (
        <span className="rounded-full border border-line-2 bg-inset px-2.5 py-1 text-[11px] font-medium text-ink-2">
          Best effort
        </span>
      )}
    </div>
  )
}

function MemoryWriteCard() {
  return <p className="text-sm text-ink-2">Saved this run to memory for future reuse.</p>
}

const CARD_META = {
  memory_read:  { title: 'Memory',   Icon: Database },
  orchestrate:  { title: 'Plan',     Icon: ListDashes },
  researcher:   { title: 'Research', Icon: MagnifyingGlass },
  critic:       { title: 'Critique', Icon: Star },
  memory_write: { title: 'Saved',    Icon: CloudArrowUp },
}

export default function NodeCard({ event }) {
  const reduce = useReducedMotion()
  const { node, update, isRetry, passIndex } = event
  const meta = CARD_META[node]
  const Icon = meta?.Icon

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-line bg-surface shadow-soft px-5 py-4"
    >
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={15} weight="regular" className="text-accent" />}
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-3">
          {meta?.title ?? node}
        </span>
        {isRetry && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-accent-ring bg-accent-soft px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-accent">
            <ArrowClockwise size={10} weight="bold" />
            Retry {passIndex - 1}
          </span>
        )}
      </div>

      {node === 'memory_read'  && <MemoryCard  update={update} />}
      {node === 'orchestrate'  && <OrchestrateCard update={update} />}
      {node === 'researcher'   && <ResearcherCard  update={update} />}
      {node === 'critic'       && <CriticCard update={update} isRetry={isRetry} />}
      {node === 'memory_write' && <MemoryWriteCard />}
    </motion.div>
  )
}
