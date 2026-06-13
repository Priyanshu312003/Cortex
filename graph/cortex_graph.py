from langgraph.graph import StateGraph, END
from graph.state import State
from agents.memory_agent import memory_read, memory_write
from agents.orchestrator import orchestrate
from agents.researcher import researcher
from agents.writer import writer
from agents.critic import critic 
from agents.router import route_after_critic

def build_graph():
    graph = StateGraph(State)
    
    # Nodes
    graph.add_node("memory_read", memory_read)
    graph.add_node("orchestrate", orchestrate)
    graph.add_node("researcher", researcher)
    graph.add_node("writer", writer)
    graph.add_node("critic", critic)
    graph.add_node("memory_write", memory_write)
    
    # Edge connections
    graph.set_entry_point("memory_read")
    graph.add_edge("memory_read", "orchestrate")
    graph.add_edge("orchestrate", "researcher")
    graph.add_edge("researcher", "writer")
    graph.add_edge("writer", "critic")
    graph.add_conditional_edges(
        "critic",
        route_after_critic,
        {
            "researcher": "researcher",
            "memory_write": "memory_write"
        }
    )
    graph.add_edge("memory_write", END)
    
    return graph.compile()