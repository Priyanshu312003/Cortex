import { motion, useReducedMotion } from 'motion/react'
import {
  Database,
  ListDashes,
  MagnifyingGlass,
  PencilSimple,
  Star,
  CloudArrowUp,
  CheckCircle,
  Circle,
  CircleNotch,
  ArrowClockwise,
} from '@phosphor-icons/react'

const STEP_META = {
  memory_read:  { label: 'Memory',   Icon: Database },
  orchestrate:  { label: 'Plan',     Icon: ListDashes },
  researcher:   { label: 'Research', Icon: MagnifyingGlass },
  writer:       { label: 'Write',    Icon: PencilSimple },
  critic:       { label: 'Critique', Icon: Star },
  memory_write: { label: 'Save',     Icon: CloudArrowUp },
}

function buildStepList(events) {
  const hasRetry = events.some(e => e.isRetry)

  const template = [
    { node: 'memory_read',  passIndex: 1 },
    { node: 'orchestrate',  passIndex: 1 },
    { node: 'researcher',   passIndex: 1 },
    { node: 'writer',       passIndex: 1 },
    { node: 'critic',       passIndex: 1 },
    ...(hasRetry ? [
      { node: 'researcher', passIndex: 2, retryStart: true },
      { node: 'writer',     passIndex: 2 },
      { node: 'critic',     passIndex: 2 },
    ] : []),
    { node: 'memory_write', passIndex: 1 },
  ]

  return template.map((item, idx) => {
    const evt = events.find(
      e => e.node === item.node && e.passIndex === item.passIndex
    )
    const prevItem = template[idx - 1]
    // treat "no previous item" as already done so the first step is active initially
    const prevDone = prevItem
      ? !!events.find(e => e.node === prevItem.node && e.passIndex === prevItem.passIndex)
      : true
    return {
      ...item,
      meta: STEP_META[item.node],
      event: evt ?? null,
      isDone: !!evt,
      isActive: !evt && prevDone,
    }
  })
}

function StepRow({ step, isLast, isRunning }) {
  const reduce = useReducedMotion()
  const { meta, isDone, isActive, event, retryStart } = step
  const Icon = meta?.Icon
  const live = isActive && isRunning

  return (
    <>
      {retryStart && (
        <div className="flex items-center gap-1.5 my-2.5 pl-0.5">
          <ArrowClockwise size={11} weight="bold" className="text-accent" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-accent">
            Retry 1
          </span>
          <span className="flex-1 h-px bg-accent-ring/70" />
        </div>
      )}

      <div
        className={`flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 transition-colors ${
          live ? 'bg-accent-soft ring-1 ring-accent-ring' : ''
        }`}
      >
        {/* Status icon */}
        <div className="shrink-0">
          {isDone ? (
            <motion.span
              key="done"
              initial={reduce ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 18 }}
              className="block"
            >
              <CheckCircle size={20} weight="fill" className="text-accent" />
            </motion.span>
          ) : live ? (
            <span className="grid place-items-center w-5 h-5 rounded-full pulse-ring">
              <CircleNotch
                size={18}
                weight="bold"
                className="text-accent-bright animate-spin motion-reduce:animate-none"
              />
            </span>
          ) : (
            <Circle size={20} className="text-line-2" />
          )}
        </div>

        {/* Label + inline meta */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {Icon && (
            <Icon
              size={14}
              weight={live ? 'bold' : 'regular'}
              className={live ? 'text-accent' : isDone ? 'text-ink-2' : 'text-ink-3'}
            />
          )}
          <span
            className={`text-sm leading-snug ${
              live
                ? 'text-accent font-semibold'
                : isDone
                ? 'text-ink-2'
                : 'text-ink-3'
            }`}
          >
            {meta?.label}
          </span>

          {isDone && step.node === 'critic' && event?.update?.critic_score != null && (
            <span className="ml-auto font-mono text-xs font-medium text-accent tabular-nums">
              {event.update.critic_score}/10
            </span>
          )}
          {isDone && step.node === 'orchestrate' && event?.update?.tasks?.length > 0 && (
            <span className="ml-auto text-xs text-ink-3 font-mono tabular-nums">
              {event.update.tasks.length}
            </span>
          )}
        </div>
      </div>

      {!isLast && <div className="ml-[9px] w-px h-2.5 bg-line" />}
    </>
  )
}

// Compact critique result, docked under the pipeline. Full feedback still
// lives in the Final Report header; here we show score + a short version.
function CritiqueDock({ critic }) {
  const reduce = useReducedMotion()
  const score = critic.critic_score
  const passed = score >= 7
  const feedback = critic.critic_feedback
  const failed = feedback === 'Critic failed to evaluate.'

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-line bg-surface shadow-soft px-4 py-3.5"
    >
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-3">
          Critique
        </p>
        <Star size={12} weight="fill" className="text-accent" />
      </div>

      <div className="flex items-center gap-2.5 px-1">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-semibold font-mono tabular-nums text-accent leading-none">
            {score}
          </span>
          <span className="text-ink-3 text-xs">/10</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            passed
              ? 'border border-accent-ring bg-accent-soft text-accent'
              : 'border border-line-2 bg-inset text-ink-2'
          }`}
        >
          {passed ? 'Passed' : 'Below threshold'}
        </span>
      </div>

      {feedback && !failed && (
        <p className="mt-2.5 px-1 text-xs leading-relaxed text-ink-2 line-clamp-3">
          {feedback}
        </p>
      )}
    </motion.div>
  )
}

export default function PipelineSidebar({ events, status, critic, saved }) {
  const steps = buildStepList(events)
  const isRunning = status === 'running'
  const hasCritique = critic?.critic_score != null

  return (
    <aside className="w-full md:w-56 shrink-0 md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:pr-0.5 space-y-3">
      {/* Pipeline stages */}
      <div className="rounded-2xl border border-line bg-surface shadow-soft px-4 py-4">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-3">
            Pipeline
          </p>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bright pulse-ring" />
              Live
            </span>
          )}
        </div>
        {steps.map((step, idx) => (
          <StepRow
            key={`${step.node}-${step.passIndex}`}
            step={step}
            isLast={idx === steps.length - 1}
            isRunning={isRunning}
          />
        ))}
      </div>

      {/* Critique result */}
      {hasCritique && <CritiqueDock critic={critic} />}

      {/* Saved confirmation - quiet line */}
      {saved && (
        <div className="flex items-center gap-2 px-1.5 text-xs text-ink-3">
          <CheckCircle size={14} weight="fill" className="text-accent shrink-0" />
          <span>Saved to memory for future reuse</span>
        </div>
      )}
    </aside>
  )
}
