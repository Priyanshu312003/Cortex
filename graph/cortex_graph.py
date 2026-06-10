from langgraph.graph import StateGraph, END
from graph.state import State
from agents.orchestrator import orchestrate
from agents.researcher import researcher
from agents.writer import writer

def build_graph():
    graph = StateGraph(State)
    
    # Nodes
    graph.add_node("orchestrate", orchestrate)
    graph.add_node("researcher", researcher)
    graph.add_node("writer", writer)
    
    # Edge connections
    graph.set_entry_point("orchestrate")
    graph.add_edge("orchestrate", "researcher")
    graph.add_edge("researcher", "writer")
    graph.add_edge("writer", END)
    
    return graph.compile()