import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, useReducedMotion } from 'motion/react'
import { WarningCircle } from '@phosphor-icons/react'

export default function ReportPanel({ markdown, score, feedback }) {
  const reduce = useReducedMotion()
  const criticFailed = feedback === 'Critic failed to evaluate.'

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-line-2 bg-surface shadow-report overflow-hidden"
    >
      {/* Amber top bar — signals this is the deliverable */}
      <div className="h-1 bg-gradient-to-r from-accent via-accent-bright to-accent" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-line px-7 pt-5 pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            Deliverable
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink leading-none">
            Final Report
          </h2>
        </div>
        {score != null && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-3">
              quality
            </span>
            <span className="rounded-lg border border-accent-ring bg-accent-soft px-3 py-1 font-mono text-base font-semibold tabular-nums text-accent">
              {score}/10
            </span>
          </div>
        )}
      </div>

      {/* Critic feedback - the ONLY place feedback appears */}
      {feedback && !criticFailed && (
        <div className="border-b border-line bg-accent-soft/60 px-7 py-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-accent mb-1.5">
            Critic feedback
          </p>
          <p className="text-sm leading-relaxed text-ink-2">{feedback}</p>
        </div>
      )}

      {/* Graceful critic-failure state */}
      {criticFailed && (
        <div className="flex items-start gap-2.5 border-b border-line bg-inset px-7 py-4">
          <WarningCircle size={18} weight="fill" className="text-accent shrink-0 mt-px" />
          <p className="text-sm text-ink-2">
            The critic could not score this report. The draft below is shown as-is.
          </p>
        </div>
      )}

      {/* Markdown body */}
      <div className="px-7 py-7 prose-cortex">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </motion.div>
  )
}
