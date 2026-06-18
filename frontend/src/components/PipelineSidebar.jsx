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

      <div className="flex items-center gap-3 py-1">
        {/* Status icon */}
        <div className="shrink-0">
          {isDone ? (
            <CheckCircle size={20} weight="fill" className="text-accent" />
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
              weight="regular"
              className={live ? 'text-accent' : isDone ? 'text-ink-2' : 'text-ink-3'}
            />
          )}
          <span
            className={`text-sm leading-snug ${
              live
                ? 'text-ink font-medium'
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

      {!isLast && <div className="ml-[9px] w-px h-3 bg-line" />}
    </>
  )
}

export default function PipelineSidebar({ events, status }) {
  const steps = buildStepList(events)
  const isRunning = status === 'running'

  return (
    <aside className="w-full md:w-56 shrink-0 md:sticky md:top-24">
      <div className="rounded-2xl border border-line bg-surface shadow-soft px-5 py-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-ink-3 mb-4">
          Pipeline
        </p>
        {steps.map((step, idx) => (
          <StepRow
            key={`${step.node}-${step.passIndex}`}
            step={step}
            isLast={idx === steps.length - 1}
            isRunning={isRunning}
          />
        ))}
      </div>
    </aside>
  )
}
