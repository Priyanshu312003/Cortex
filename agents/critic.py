from graph.state import State
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field, StrictInt
from langsmith import traceable
from utils.scoring import log_score

class CriticResult(BaseModel):
    # StrictInt rejects bools and numeric strings; ge/le enforce the 1-10 range.
    # A malformed/out-of-range score fails validation -> raises -> hits except.
    score: StrictInt = Field(ge=1, le=10)
    feedback: str
    
llm = ChatOpenAI(model="gpt-4o-mini")
structured_llm = llm.with_structured_output(CriticResult)

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
    Provide an integer score from 1 to 10 and 2-3 sentences of feedback on weaknesses
    (or 'No major issues.' if the score is >= 8).
    """

    try:
        result = structured_llm.invoke([HumanMessage(content=CRITIC_PROMPT)])
        score = result.score
        feedback = result.feedback
        revision_count = state.get("revision_count", 0) + 1
        log_score(goal, score, revision_count)
        return {"critic_score": score, "critic_feedback": feedback, "revision_count": revision_count}

    # 5. on failure, return a safe default
    except Exception as e:
        print("Critic error:", e)
        revision_count = state.get("revision_count", 0) + 1
        log_score(goal, 1, revision_count)
        return {"critic_score": 1, "critic_feedback": "Critic failed to evaluate.", "revision_count": revision_count}