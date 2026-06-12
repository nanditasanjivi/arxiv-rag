from pinecone import Pinecone
from core.config import settings

_index = None


def get_index():
    global _index
    if _index is None:
        pc = Pinecone(api_key=settings.pinecone_api_key)
        _index = pc.Index(settings.pinecone_index)
    return _index


def upsert_chunks(vectors: list[dict]):
    """vectors: list of {id, values, metadata}"""
    index = get_index()
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        index.upsert(vectors=vectors[i:i + batch_size])


def search(query_vector: list[float], top_k: int = 20, paper_ids: list[str] | None = None) -> list[dict]:
    index = get_index()
    filter_dict = {"paper_id": {"$in": paper_ids}} if paper_ids else None
    result = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        filter=filter_dict,
    )
    return [
        {
            "id": match.id,
            "score": match.score,
            "text": match.metadata.get("text", ""),
            "paper_id": match.metadata.get("paper_id", ""),
            "title": match.metadata.get("title", ""),
            "authors": match.metadata.get("authors", ""),
            "page_num": match.metadata.get("page_num", 0),
            "arxiv_id": match.metadata.get("arxiv_id", ""),
        }
        for match in result.matches
    ]


def delete_paper(arxiv_id: str):
    index = get_index()
    index.delete(filter={"arxiv_id": {"$eq": arxiv_id}})
