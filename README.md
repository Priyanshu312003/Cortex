# Cortex

A multi-agent AI system built on LangGraph. Give it a goal — like *"plan a trip to Paris"* — and a pipeline of specialized agents breaks it into subtasks, researches each one with live web search, writes a structured report, critiques that report, and loops back to improve it if quality is low. Memory persists across runs, so similar future goals benefit from past work.

Cortex is **goal-agnostic**: the same pipeline handles a trip plan, a literature review, or a technology comparison. Nothing in the agents is hard-coded to a domain.

## Architecture

```
memory_read → orchestrate → researcher → writer → critic → [router] ─┬─ score < 7 & retries left → researcher (loop)
                  ↑__________________________________________________│
                                                                     └─ pass → memory_write → END
```

Each node is a single-responsibility agent:

- **memory_read** — embeds the goal and retrieves the most similar past run's output from Qdrant as `past_context`.
- **orchestrate** — breaks the goal into 3–5 self-contained, searchable subtasks. Each subtask explicitly names the goal's subject, so downstream search never loses context.
- **researcher** — runs a web search (Tavily) for each task and summarizes the results into a research body. On a retry, it steers both the search query and the summary toward the critic's feedback. Otherwise stateless: it researches whatever string it is handed.
- **writer** — turns the combined research into a structured Markdown report.
- **critic** — scores the report 1–10 against the goal (using the research as ground truth) and returns feedback. Output is validated through a strict Pydantic schema; evaluation failures score 1, not a fake pass.
- **router** — if the score passes the threshold or revisions are exhausted, the run finishes; otherwise it loops back to research again.
- **memory_write** — persists the goal and final output to Qdrant for future runs.

## Tech Stack

- **LangGraph** — graph orchestration, conditional edges, the feedback loop
- **OpenAI** — GPT-4o-mini for the agents; `text-embedding-3-small` (1536-dim) for memory
- **Tavily** — live web search
- **Qdrant** — vector store for cross-run memory (cosine, 1536-dim)
- **LangSmith** — tracing and observability (`@traceable`)
- **Pydantic** — structured, validated critic output
- **Python 3.12**

## Project Structure

```
Cortex/
├── agents/
│   ├── orchestrator.py    # goal → self-contained subtasks
│   ├── researcher.py      # tasks → web search → summaries
│   ├── writer.py          # research → structured report
│   ├── critic.py          # report → score + feedback (Pydantic schema)
│   ├── router.py          # conditional routing after critic
│   └── memory_agent.py    # read/write wrappers around the vector store
├── graph/
│   ├── state.py           # shared State (TypedDict)
│   └── cortex_graph.py    # node + edge wiring, compiled graph
├── memory/
│   └── qdrant_memory.py   # Qdrant + embeddings: save_to_memory / search_memory
├── utils/
│   └── scoring.py         # per-run score logging + average across runs
├── main.py                # entry point
├── requirements.txt
└── .env                   # API keys (not committed)
```

## Setup

1. Clone and enter the project:
   ```bash
   git clone <your-repo-url>
   cd Cortex
   ```

2. Create and activate a virtual environment (Python 3.12):
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS / Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root:
   ```
   OPENAI_API_KEY=your_openai_key
   TAVILY_API_KEY=your_tavily_key
   QDRANT_URL=your_qdrant_cloud_url
   QDRANT_API_KEY=your_qdrant_api_key
   LANGSMITH_API_KEY=your_langsmith_key
   LANGSMITH_TRACING=true
   LANGSMITH_PROJECT=cortex
   LANGSMITH_ENDPOINT=your_langsmith_endpoint
   ```

## Usage

Set the goal in `main.py` (`initial_state["goal"]`), then run:

```bash
python main.py
```

The run prints the final report, the critic's score, its feedback, and the average score across all logged runs. On the first run a `cortex_memory` collection is created in Qdrant automatically; later runs with similar goals retrieve prior output as context.

## How the Feedback Loop Works

After the writer produces a report, the critic scores it 1–10. The router then decides:

- **score ≥ 7** → accept, write to memory, finish.
- **score < 7 and revisions remain** → loop back to the researcher for another pass, steered by the critic's feedback.
- **revisions exhausted** → accept the best available and finish.

`MAX_REVISIONS` (in `router.py`) caps how many times the loop can retry, so a low-scoring run can't loop forever.

## Quality Tracking

Every critic evaluation is appended to `scores.jsonl` (timestamp, goal, score, revision count). `utils/scoring.py` exposes `get_average_score()`, printed at the end of each run, so report quality is tracked across runs over time.

## Roadmap

- Feed `critic_feedback` back into re-planning (loop to `orchestrate`, not just `researcher`) so the subtask breakdown itself can be reshaped on a retry
- FastAPI backend + React frontend