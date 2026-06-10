from typing import TypedDict, List

class State(TypedDict):
    goal: str
    tasks: List[str]
    research: str
    output: str