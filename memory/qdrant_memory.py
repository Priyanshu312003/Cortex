from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from langchain_openai import OpenAIEmbeddings
import os
import time
from dotenv import load_dotenv
load_dotenv()

client = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_API_KEY"))
embeddings = OpenAIEmbeddings()
COLLECTION_NAME = "cortex_memory"

def save_to_memory(goal: str, output: str) -> None:
    # 1. creating collection if it doesn't exist
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
        )
        
    # 2. converting goal to embedding
    vector = embeddings.embed_query(goal)
    
    # 3. store goal + output in qdrant
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[PointStruct(
            id=int(time.time()),  #used timestamp as unique id for simplicity
            vector=vector,
            payload={"goal": goal, "output": output}
        )]
    )

def search_memory(goal: str) -> str:
    # 1. converting goal to embedding
    vector = embeddings.embed_query(goal)
    
    # 2. searching qdrant for similar past runs
    try:
        results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=vector,
        limit=1
        )
        if results:
            return results[0].payload["output"]
    except Exception:
        return ""