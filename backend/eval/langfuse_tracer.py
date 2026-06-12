from langfuse import Langfuse
from core.config import settings

_client: Langfuse | None = None


def get_langfuse() -> Langfuse:
    global _client
    if _client is None:
        _client = Langfuse(
            secret_key=settings.langfuse_secret_key,
            public_key=settings.langfuse_public_key,
            host=settings.langfuse_host,
        )
    return _client


def create_rag_trace(session_id: str, query: str, retrieved_chunks: list[dict],
                     response: str, latency_ms: float) -> str:
    lf = get_langfuse()
    trace = lf.trace(name="rag-query", session_id=session_id, input=query, output=response)

    trace.span(
        name="retrieval",
        input={"query": query},
        output={"chunks": retrieved_chunks, "count": len(retrieved_chunks)},
    )
    trace.span(
        name="generation",
        input={"prompt_messages_count": 1},
        output={"response": response[:500], "latency_ms": latency_ms},
    )
    lf.flush()
    return trace.id
