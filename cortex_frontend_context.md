# Cortex — Frontend Build Context (handoff)

This document is a self-contained briefing for building the **React frontend** for Cortex. It assumes the reader has NO prior conversation history. Everything needed to build the UI against the existing backend is here. Read it fully before writing code.

---

## 1. What Cortex Is

Cortex is a **goal-agnostic, multi-agent AI research system** built on LangGraph (Python). The user gives a goal in plain English (e.g. *"plan a trip to Paris"*, *"compare React vs Vue"*, *"literature review on transformers"*), and a pipeline of specialized agents:

1. breaks the goal into subtasks,
2. researches each subtask via live web search (Tavily),
3. writes a structured Markdown report,
4. critiques the report and scores it 1–10,
5. **loops back to research again if the score is low** (self-correction),
6. persists results to a vector store so future similar goals reuse past work.

It is **not** a travel app — "Paris" is just the usual test goal. Nothing is hard-coded to a domain.

**The single most distinctive feature for the UI to surface: the self-correcting retry loop.** When the critic scores below 7, the pipeline runs the researcher a second time. The frontend should make this visible (see §6), because it's the thing that makes a multi-agent system interesting to look at.

---

## 2. The Pipeline (what the frontend visualizes)

The backend runs these nodes **in this order**, emitting one event as each finishes:

```
memory_read → orchestrate → researcher → writer → critic → [router decision]
                  ↑_______________________________________________│
                  (on low score: loop back to researcher, max 1 retry)
                                                                   │
                                                          (on pass) → memory_write → END
```

What each node produces (this is the data the frontend receives):

| Node           | Meaning (plain English)                                  | Key field(s) in its update payload         |
|----------------|----------------------------------------------------------|--------------------------------------------|
| `memory_read`  | Looks up the most similar past run from memory           | `past_context` (string, may be empty)      |
| `orchestrate`  | Splits the goal into 3–5 searchable subtasks             | `tasks` (list of strings)                  |
| `researcher`   | Web-searches each task, summarizes findings              | `research` (string)                        |
| `writer`       | Turns research into a structured Markdown report         | `output` (string, Markdown)                |
| `critic`       | Scores the report 1–10 + gives feedback                  | `critic_score` (int), `critic_feedback` (string), `revision_count` (int) |
| `memory_write` | Saves the final result to memory                         | (empty update `{}`)                        |

**`researcher` and `critic` can each appear TWICE in one run** if the loop fires (first pass + retry). Every other node appears once.

A typical run takes **30–90 seconds** because of multiple LLM calls + web searches. The streaming UI exists precisely so this wait feels alive instead of a frozen spinner.

---

## 3. The Backend Contract (THIS IS THE IMPORTANT PART)

The backend is **already built, tested, and working.** Do NOT modify it. The frontend consumes it exactly as described here.

### Endpoint

```
POST http://localhost:8000/run
Content-Type: application/json
Body: {"goal": "plan a trip to Paris"}
```

The server (FastAPI + sse-starlette) responds with a **Server-Sent Events (SSE) stream**: a long-lived HTTP response that emits events one at a time as each pipeline node finishes, rather than one response at the end.

### Event format

Two event types come over the stream:

**`node` events** — one per node as it completes:
```
event: node
data: {"node": "orchestrate", "update": {"tasks": ["1. ...", "2. ..."]}}
```
- `data` is a JSON string. Parse it. It has exactly two keys:
  - `node`: the node name (string) — one of the names in the §2 table.
  - `update`: an object containing whatever that node produced (the "Key field(s)" column in §2).

**`done` event** — fires once, after the whole run finishes:
```
event: done
data: {}
```
- Signals the stream is complete. The frontend should stop listening and show the finished state.

### Verified real example (first two events of an actual run)

```
event: node
data: {"node": "memory_read", "update": {"past_context": "# Paris Vacation Planning Report\n\n## Overview\n..."}}

event: node
data: {"node": "orchestrate", "update": {"tasks": ["1. research travel date options for a trip to Paris", "2. create a detailed trip budget...", "3. compare flight options...", "4. investigate budget accommodation...", "5. compile a list of must-visit attractions..."]}}
```

The run continues with `researcher` (→ `research` text), `writer` (→ `output` Markdown), `critic` (→ `critic_score`, `critic_feedback`, `revision_count`), then `memory_write`, then the `done` event.

---

## 4. CRITICAL TECHNICAL CONSTRAINT: EventSource vs POST

The browser's built-in `EventSource` API **only supports GET requests** and cannot send a request body. The Cortex endpoint is a **POST** that needs the goal in a JSON body. They do not fit together directly.

**Resolution (use this): do NOT use `EventSource`. Use `fetch()` with a streaming response reader.**

`fetch()` supports POST + body, and its response body can be read as a stream via `response.body.getReader()`. You then manually decode the byte chunks into text and parse the SSE lines yourself.

Do NOT change the backend to a GET to make `EventSource` work — the backend is proven and the goal belongs in the body, not the URL.

### Reference: how to read the SSE stream with fetch

```javascript
async function runCortex(goal, onEvent, onDone) {
  const response = await fetch("http://localhost:8000/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line ("\n\n").
    const parts = buffer.split("\n\n");
    buffer = parts.pop(); // keep the last (possibly incomplete) chunk in buffer

    for (const part of parts) {
      // Each `part` looks like: "event: node\ndata: {...}"
      const lines = part.split("\n");
      let eventType = "message";
      let dataStr = "";
      for (const line of lines) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;

      if (eventType === "done") {
        onDone();
      } else {
        const parsed = JSON.parse(dataStr); // { node, update }
        onEvent(parsed);
      }
    }
  }
}
```

The buffering matters: a network chunk may split an event in half, so accumulate in `buffer` and only process complete events (delimited by the blank line `\n\n`), keeping any partial trailing piece for the next read.

---

## 5. Suggested UI Concept (the streaming IS the design)

The interface should make the pipeline legible as it runs. Minimum viable shape:

- A **goal input** (text box) + a **Run** button at the top.
- A **vertical timeline / stage list** of the pipeline stages: Memory → Orchestrate → Research → Write → Critique → Done. Each stage starts as "pending", flips to "running"/"done" as its event arrives.
- As each node event lands, show what it produced:
  - `orchestrate` → render the list of subtasks.
  - `researcher` → show (or collapse) the research summary.
  - `writer` → render the final report as **Markdown** (use a markdown renderer, e.g. `react-markdown`).
  - `critic` → show the score (1–10) and feedback prominently.
- A **final report panel** showing the rendered Markdown `output`, with the critic's score + feedback beside or above it.

The look/theme is **deliberately undecided** — build it functional and plain first; styling is a later pass. (Note: the project owner's portfolio uses a "Holographic Terminal" black + acid-green #00FF94 theme, but he explicitly does NOT want the frontend to copy that look. Give Cortex its own identity, decided later.)

### 5.A Design guidance (if a frontend design skill is used)

**Cortex is a product/tool UI, not a landing page.** It is a live, streaming dashboard-style interface. If you are applying a landing-page / portfolio design skill, IGNORE its landing-page-specific rules (heroes, eyebrows, "trusted by" logo walls, bento grids, testimonials, marquees, scroll-hijack/GSAP pinning). Those do not apply here.

DO apply the general good-taste rules that hold for any frontend:
- One accent color, used consistently. No AI-purple gradients, no neon glows.
- Off-black / off-white instead of pure `#000`/`#fff`.
- A non-default font (avoid Inter-as-default; no random serif).
- Icons from a real library (Phosphor / Tabler / Radix), never hand-rolled SVG paths.
- Full UI states: a "running" state per node, a finished state, and a visible **error state** (the critic can return score 1 / "Critic failed to evaluate." — show it, don't crash).
- Honor `prefers-reduced-motion` (this UI animates as nodes update).
- Zero em-dashes (`—`) in any visible text; use a regular hyphen.

**Dial settings for this project** (if the skill uses VARIANCE / MOTION / DENSITY dials): roughly **5–6 / 5–6 / 5–6**. Motion is *state-transition* motion (a node flips pending → done), which is the "fluid CSS transitions on transform/opacity" band — NOT scroll-driven cinema. Keep variance and density moderate so the streamed output stays readable.

---

## 6. THE RETRY BADGE (must-have behavior)

Because `researcher` and `critic` can fire twice in one run, identifying events by node name alone is insufficient — a second `researcher` event would otherwise just overwrite the first, hiding the loop.

**Requirement:** when the loop fires, the UI must show a **retry badge** (e.g. "Retry 1") so the self-correction is visible.

**How to detect it:** the `critic` event's `update` carries `revision_count` (an integer). On the first pass it's `1`; on a retry it's `2`. When the frontend sees a `critic` event with `revision_count > 1`, OR sees a node it has already seen earlier in the run, that's a retry — surface the badge and show the second pass as a distinct entry (don't overwrite the first). Keep both passes visible so the user can see the report improved.

---

## 7. Project Layout

The repo root is `Cortex/`. The backend lives alongside the agents:

```
Cortex/
├── agents/            # the pipeline agents (Python — do not touch for frontend work)
├── graph/             # LangGraph wiring (Python — do not touch)
├── memory/            # Qdrant vector memory (Python — do not touch)
├── utils/             # score logging (Python — do not touch)
├── api/
│   ├── __init__.py
│   └── main.py        # FastAPI SSE endpoint — the contract in §3. DO NOT MODIFY.
├── main.py            # CLI entry point (separate from the API)
├── requirements.txt
└── frontend/          # ← THE REACT APP TO BUILD GOES HERE
```

Create the frontend in a `frontend/` folder at the repo root.

### Backend run command (for local testing — the frontend needs this running)
From the repo root, with the Python venv active:
```
uvicorn api.main:app --reload
```
Serves on `http://localhost:8000`. CORS is already open (`allow_origins=["*"]`) so a Vite dev server on `localhost:5173` can call it.

### Suggested frontend setup
```
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-markdown   # for rendering the report
npm run dev                  # serves on localhost:5173
```

---

## 8. Tech / Environment Facts

- Backend: Python 3.12, FastAPI, uvicorn, sse-starlette, LangGraph, OpenAI GPT-4o-mini, Tavily, Qdrant Cloud, LangSmith tracing.
- Dev machine: **Windows, PowerShell** (no `grep` — use `Select-String`; `cat` works). VS Code.
- The backend and frontend run as **two separate processes in two separate terminals**: uvicorn (server) in one, `npm run dev` (frontend) in the other.
- A Cortex run is slow (30–90s). Build the UI to tolerate that gracefully (it's the whole reason for streaming).
- The pipeline can also fail gracefully: if the critic errors, it returns `critic_score: 1` and feedback `"Critic failed to evaluate."` — the frontend should display that like any other critic result, not crash.

---

## 9. Working Preferences (for whoever builds this)

- **Explain in plain English with an analogy BEFORE showing code.** Check understanding before moving on.
- Prefer **skeleton functions the owner fills in himself**, then review, then ONE interview-style question per function — UNLESS he explicitly asks for finished code, in which case provide it directly.
- **Mark changed lines with clear comments** (e.g. `// === CHANGE ===`) so he can see exactly what changed.
- **Flag environment/setup requirements upfront** before code.
- **Do not theorize past what's actually verified.** Read real code/output first; test one thing at a time.
- Commit after every completed file/feature, **conventional commit format** (`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`).
- Be honest about what's strictly necessary vs nice-to-have; offer the minimal path when something feels like too much.

---

## 10. Current State Summary (as of this handoff)

**DONE and verified:**
- Full LangGraph pipeline working (all 6 nodes, retry loop, memory persistence).
- Quality-score tracking (`utils/scoring.py`, average printed each run).
- Critic uses strict Pydantic validation; failures score 1 (not a fake pass).
- Embedding model pinned to `text-embedding-3-small`; old Qdrant collection wiped (retrieval is clean).
- CLI accepts goal via `input()`.
- README refreshed and accurate.
- **`api/main.py` SSE streaming endpoint — built, returns `200 OK`, verified streaming real `event: node` data end to end.** This is the contract in §3.

**TO BUILD (this handoff's job):**
- The React frontend in `frontend/`, consuming the SSE stream per §3–§4, with the timeline UI (§5) and the retry badge (§6).

**Later / not now:** styling/theme decision, retry-to-re-planning (loop to orchestrate instead of researcher), logging cleanup, deployment.
