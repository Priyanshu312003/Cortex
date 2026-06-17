from dotenv import load_dotenv
load_dotenv(override=True)
from graph.cortex_graph import build_graph
from utils.scoring import get_average_score

if __name__ == "__main__":
    graph = build_graph()
    initial_state = {
        "goal": "plan a trip to Paris",
        "tasks": [],
        "research": "",
        "output": "",
        "revision_count": 0
    }
    final_state = graph.invoke(initial_state)
    print("Final Output:", final_state['output'])
    print("Critic Score:", final_state["critic_score"])
    print("Critic Feedback:", final_state["critic_feedback"])
    print("Average Score (all runs):", get_average_score())