import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

# Import the compiled graph. The API reuses Cortex exactly as-is.
from graph.cortex_graph import build_graph

# main.py loads .env before importing the graph; do the same here so the
# agents (which build ChatOpenAI at module scope) get their keys.
from dotenv import load_dotenv
load_dotenv(override=True)


app = FastAPI()

# The React app runs on a different port (e.g. localhost:5173) than this API
# (localhost:8000). Browsers block cross-origin requests by default, so we
# explicitly allow the frontend's origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to the real frontend URL later
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build the graph once at startup, not per request.
graph = build_graph()

class RunRequest(BaseModel):
    goal: str

def run_graph_events(goal: str):
    initial_state = {
        "goal": goal,
        "tasks": [],
        "research": "",
        "output": "",
        "revision_count": 0,
    }

    for chunk in graph.stream(initial_state):
        node_name = next(iter(chunk))
        node_update = chunk[node_name]
        yield {
            "event": "node",
            "data": json.dumps({"node": node_name, "update": node_update}),
        }
    
    yield {"event": "done", "data": "{}"}

# ── The endpoint ─────────────────────────────────────────────
@app.post("/run")
async def run(request: RunRequest):
    return EventSourceResponse(run_graph_events(request.goal))