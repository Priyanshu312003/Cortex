import json
from openai import OpenAI
from graph.state import State
from langsmith import traceable

client = OpenAI()


@traceable(run_type="llm", name="critic")
def critic(state: State) -> dict:
    goal = state["goal"]
    research = state["research"]
    output = state["output"]
    # 1. format CRITIC_PROMPT with state["goal"], state["research"], state["output"]
    CRITIC_PROMPT = f"""You are a strict editor reviewing a research report before publication.

    <goal>
    {goal}
    </goal>

    <research>
    {research}
    </research>

    <report>
    {output}
    </report>

    Evaluate whether the report fully and accurately addresses the goal, using the research as ground truth.
    Respond ONLY with a JSON object in this exact format:
    {{"score": <integer 1-10>, "feedback": "<2-3 sentences on weaknesses, or 'No major issues.' if score >= 8>"}}
    """
    # 2. call client.chat.completions.create()
    # 3. parse response.choices[0].message.content with json.loads()
    try:
        response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": CRITIC_PROMPT }],
        response_format=({"type": "json_object"})
        )
        content = response.choices[0].message.content
        result = json.loads(content)

    # 4. return critic_score and critic_feedback
        return {"critic_score": result.get("score", 10), "critic_feedback": result.get("feedback", "No major issues."), "revision_count": state.get("revision_count",0)+1}

    # 5. on failure, return a safe default
    except Exception as e:
        print("Critic error:", e)
        return {"critic_score": 10, "critic_feedback": "No major issues.", "revision_count": state.get("revision_count",0)+1}