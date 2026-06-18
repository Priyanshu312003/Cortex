/**
 * Streams a Cortex run over SSE using fetch (not EventSource, which is GET-only).
 * Calls onEvent for each node update, onDone when the stream ends cleanly,
 * onError on network or server errors.
 */
export async function streamCortex(goal, onEvent, onDone, onError) {
  try {
    const res = await fetch('http://localhost:8000/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal }),
    })

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status} ${res.statusText}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // === CHANGE: normalize CRLF -> LF ===
      // sse-starlette emits lines separated by "\r\n" (its DEFAULT_SEPARATOR),
      // so events are delimited by "\r\n\r\n". Splitting on "\n\n" would never
      // match and every event would pile up unread. Normalize first.
      buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      // SSE events are separated by blank lines ("\n\n")
      const parts = buf.split('\n\n')
      buf = parts.pop() // last part may be incomplete; keep it for next chunk

      for (const part of parts) {
        let eventType = 'message'
        let dataStr = ''

        for (const line of part.split('\n')) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim()
          else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
        }

        if (!dataStr) continue

        if (eventType === 'done') {
          console.log('[cortex] done') // === CHANGE: debug ===
          onDone()
        } else if (eventType === 'node') {
          try {
            const parsed = JSON.parse(dataStr)
            console.log('[cortex] node event:', parsed.node, parsed) // === CHANGE: debug ===
            onEvent(parsed)
          } catch (e) {
            console.warn('[cortex] failed to parse data payload:', dataStr, e) // === CHANGE: debug ===
          }
        }
      }
    }
  } catch (err) {
    onError(err.message || 'Connection failed')
  }
}
