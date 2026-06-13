from graph.state import State

MAX_REVISIONS = 1

def route_after_critic(state: State) -> str:
    print(f"ROUTER: score={state['critic_score']}, revision_count={state['revision_count']}")
    if state["critic_score"] >= 7:
        return "memory_write"
    if state["revision_count"] > MAX_REVISIONS:
        return "memory_write"
    return "researcher"