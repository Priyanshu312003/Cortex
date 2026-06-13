from graph.cortex_graph import build_graph

if __name__ == "__main__":
    graph = build_graph()
    initial_state = {
        "goal": "plan a trip to Paris",
        "tasks": [],
        "research": "",
        "output": ""
    }
    final_state = graph.invoke(initial_state)
    print("Final Output:", final_state['output'])
    print("Critic Score:", final_state["critic_score"])
    print("Critic Feedback:", final_state["critic_feedback"])