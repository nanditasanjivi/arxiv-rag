import cohere
from tenacity import retry, stop_after_attempt, wait_exponential
from core.config import settings

_client: cohere.Client | None = None


def get_client() -> cohere.Client:
    global _client
    if _client is None:
        _client = cohere.Client(api_key=settings.cohere_api_key)
    return _client


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def rerank(query: str, chunks: list[dict], top_k: int = 5) -> list[dict]:
    if not chunks:
        return []
    client = get_client()
    documents = [c["text"] for c in chunks]
    result = client.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=documents,
        top_n=top_k,
    )
    reranked = []
    for item in result.results:
        chunk = chunks[item.index].copy()
        chunk["rerank_score"] = item.relevance_score
        reranked.append(chunk)
    return reranked
