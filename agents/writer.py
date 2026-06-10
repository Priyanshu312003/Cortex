from graph.state import State
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini")

def writer(state: State) -> dict:
    research = state['research']
    prompt = f"""You are a writer agent. your job is to take all the research findings provided in the <research> section and turn it into clean, structured report. Like a writer who egts raw research notes and produces a polished document from them.
    Input: messy research strings from each task
    Output: one clean structured report with headings, bullets, summary — readable by a human.
    <research>
    {research}
    </research>
    """
    response = llm.invoke([HumanMessage(content=prompt)])
    output = response.content
    return {"output": output}

if __name__ == "__main__":
    state = State(
        goal="Plan a trip to Paris",
        tasks=[],
        research="""The best time to visit Paris is spring or fall. 
        
Top attractions include Eiffel Tower, Louvre Museum, Notre-Dame Cathedral.""",
        output=""
    )
    result = writer(state)
    print(result)