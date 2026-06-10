from typing import TypedDict, List

class State(TypedDict):
    past_context: str  # relevant outputs from previous runs
    goal: str
    tasks: List[str]
    research: str
    output: str