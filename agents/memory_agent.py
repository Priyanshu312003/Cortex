from graph.state import State
from memory.qdrant_memory import save_to_memory, search_memory


def memory_read(state: State) -> dict:
    results = search_memory(state["goal"])
    return {"past_context": results}
    
def memory_write(state: State) -> dict:
    save_to_memory(state["goal"], state["output"])
    return {}