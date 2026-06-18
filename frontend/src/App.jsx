import { useState, useReducer, useCallback } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Brain, CircleNotch, CheckCircle, WarningCircle, Sparkle } from '@phosphor-icons/react'
import GoalInput from './components/GoalInput.jsx'
import PipelineSidebar from './components/PipelineSidebar.jsx'
import EventFeed from './components/EventFeed.jsx'
import ReportPanel from './components/ReportPanel.jsx'
import { streamCortex } from './lib/streamCortex.js'

function eventsReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return { events: [], seenNodes: {} }
    case 'ADD_EVENT': {
      const { node, update } = action.payload
      const seenCount = (state.seenNodes[node] ?? 0) + 1
      return {
        events: [
          ...state.events,
          {
            id: state.events.length,
            node,
            update,
            passIndex: seenCount,
            isRetry: seenCount > 1,
          },
        ],
        seenNodes: { ...state.seenNodes, [node]: seenCount },
      }
    }
    default:
      return state
  }
}

const EXAMPLE_GOALS = [
  'Compare Postgres and SQLite for a small side project',
  'Literature review on retrieval-augmented generation',
  'Plan a 5-day trip to Lisbon on a modest budget',
]

function EmptyState({ onPick }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mt-16 flex flex-col items-center text-center"
    >
      <div className="grid place-items-center w-14 h-14 rounded-2xl bg-accent-soft border border-accent-ring">
        <Sparkle size={24} weight="fill" className="text-accent" />
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight text-ink">
        Give Cortex a goal
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">
        A pipeline of agents will plan it, research the web, draft a report, then
        critique and retry itself until the result holds up.
      </p>

      <div className="mt-7 flex flex-col gap-2 w-full max-w-md">
        <p className="text-[10px] font-mono uppercase tracking-wider text-ink-3">
          Try one
        </p>
        {EXAMPLE_GOALS.map(g => (
          <button
            key={g}
            onClick={() => onPick(g)}
            className="group flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink-2 shadow-soft transition-colors hover:border-accent-ring hover:text-ink"
          >
            <span className="flex-1">{g}</span>
            <span className="font-mono text-xs text-ink-3 transition-colors group-hover:text-accent">
              use
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export default function App() {
  const [goal, setGoal] = useState('')
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [errorMsg, setErrorMsg] = useState(null)
  const [{ events }, dispatch] = useReducer(eventsReducer, { events: [], seenNodes: {} })

  const handleRun = useCallback(async () => {
    if (!goal.trim() || status === 'running') return
    dispatch({ type: 'RESET' })
    setStatus('running')
    setErrorMsg(null)

    await streamCortex(
      goal.trim(),
      parsed => dispatch({ type: 'ADD_EVENT', payload: parsed }),
      () => setStatus('done'),
      err => {
        setErrorMsg(err)
        setStatus('error')
      },
    )
  }, [goal, status])

  // The latest writer output and critic results feed the report panel
  const writerEvents = events.filter(e => e.node === 'writer')
  const criticEvents = events.filter(e => e.node === 'critic')
  const latestReport = writerEvents.at(-1)?.update?.output ?? null
  const latestCritic = criticEvents.at(-1)?.update ?? null

  const showPipeline = status !== 'idle'
  const doneCount = events.length

  return (
    <div className="min-h-[100dvh] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent">
            <Brain size={17} weight="fill" className="text-white" />
          </span>
          <span className="font-semibold tracking-tight text-ink">Cortex</span>
          <span className="text-ink-3 text-sm">multi-agent research</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <GoalInput
          goal={goal}
          setGoal={setGoal}
          onRun={handleRun}
          isRunning={status === 'running'}
        />

        {/* Status line */}
        {status === 'running' && (
          <div className="flex items-center gap-2 mt-4 text-xs font-medium text-accent">
            <CircleNotch size={13} className="animate-spin motion-reduce:animate-none" />
            Working... {doneCount} stage{doneCount !== 1 ? 's' : ''} complete
          </div>
        )}
        {status === 'done' && (
          <div className="flex items-center gap-2 mt-4 text-xs font-medium text-accent">
            <CheckCircle size={13} weight="fill" />
            Run complete
          </div>
        )}

        {/* Error state */}
        {status === 'error' && errorMsg && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-accent-ring bg-accent-soft px-4 py-3 text-sm text-ink-2">
            <WarningCircle size={18} weight="fill" className="text-accent shrink-0 mt-px" />
            <div>
              <p className="font-medium text-ink">Could not reach Cortex</p>
              <p className="mt-0.5">{errorMsg}. Check that the backend is running on localhost:8000.</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {status === 'idle' && <EmptyState onPick={setGoal} />}

        {/* Pipeline layout: sidebar + content */}
        {showPipeline && (
          <div className="mt-8 flex flex-col md:flex-row gap-8 items-start">
            <PipelineSidebar events={events} status={status} />

            <div className="flex-1 min-w-0 space-y-4">
              <EventFeed events={events} />
              {latestReport && (
                <ReportPanel
                  markdown={latestReport}
                  score={latestCritic?.critic_score}
                  feedback={latestCritic?.critic_feedback}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
