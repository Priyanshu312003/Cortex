import { motion, useReducedMotion } from 'motion/react'
import { Play, CircleNotch } from '@phosphor-icons/react'

export default function GoalInput({ goal, setGoal, onRun, isRunning }) {
  const reduce = useReducedMotion()

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey && !isRunning) onRun()
  }

  return (
    <div className="flex gap-3">
      <input
        type="text"
        value={goal}
        onChange={e => setGoal(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask Cortex to research anything..."
        disabled={isRunning}
        className="flex-1 rounded-xl border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink placeholder-ink-3 outline-none shadow-soft transition-colors focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:opacity-60"
      />
      <motion.button
        onClick={onRun}
        disabled={isRunning || !goal.trim()}
        whileHover={reduce || isRunning ? undefined : { y: -1 }}
        whileTap={reduce || isRunning ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-[#a8370a] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isRunning ? (
          <>
            <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" />
            Running
          </>
        ) : (
          <>
            <Play size={15} weight="fill" />
            Run
          </>
        )}
      </motion.button>
    </div>
  )
}
