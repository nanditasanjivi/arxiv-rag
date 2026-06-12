import voyageai
from tenacity import retry, stop_after_attempt, wait_exponential
from core.config import settings

_client: voyageai.AsyncClient | None = None


def get_client() -> voyageai.AsyncClient:
    global _client
    if _client is None:
        _client = voyageai.AsyncClient(api_key=settings.voyage_api_key)
    return _client


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def embed_texts(texts: list[str]) -> list[list[float]]:
    client = get_client()
    # Voyage API batches up to 128 texts at a time
    all_embeddings = []
    batch_size = 128
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        result = await client.embed(batch, model=settings.voyage_model, input_type="document")
        all_embeddings.extend(result.embeddings)
    return all_embeddings


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def embed_query(text: str) -> list[float]:
    client = get_client()
    result = await client.embed([text], model=settings.voyage_model, input_type="query")
    return result.embeddings[0]
