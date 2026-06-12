import time
import asyncio
import json
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ingestion.embedder import embed_query
from retrieval.vector_store import search
from retrieval.reranker import rerank
from retrieval.context_builder import build_context
from generation.prompt_builder import SYSTEM_PROMPT, build_chat_prompt, build_comparison_prompt
from generation.claude_client import stream_response
from generation.citation_extractor import extract_cited_refs
from memory.conversation_store import get_history, append_turn
from eval.langfuse_tracer import create_rag_trace
from eval.ragas_evaluator import evaluate
from core.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str
    query: str
    paper_ids: list[str] | None = None


class CompareRequest(BaseModel):
    paper_ids: list[str]
    aspect: str


async def _rag_stream(req: ChatRequest):
    start_ms = time.time() * 1000

    # Embed + retrieve
    query_vec = await embed_query(req.query)
    chunks = search(query_vec, top_k=settings.retrieval_top_k, paper_ids=req.paper_ids)
    reranked = await rerank(req.query, chunks, top_k=settings.rerank_top_k)
    context, sources = build_context(reranked)

    # Build prompt with history
    history = await get_history(req.session_id)
    messages = build_chat_prompt(context, history, req.query)

    # Stream response
    full_response = []
    async for token in stream_response(messages, SYSTEM_PROMPT):
        full_response.append(token)
        yield f"data: {json.dumps({'type': 'delta', 'content': token})}\n\n"

    response_text = "".join(full_response)
    latency_ms = time.time() * 1000 - start_ms

    # Cited sources
    cited = extract_cited_refs(response_text, sources)
    yield f"data: {json.dumps({'type': 'citations', 'sources': cited})}\n\n"

    # Suggested follow-ups (fast, non-blocking)
    try:
        from generation.claude_client import complete
        followups_raw = await complete(
            messages=[{"role": "user", "content": f"Given this Q&A, suggest 3 concise follow-up questions.\nQ: {req.query}\nA: {response_text[:500]}\n\nRespond with a JSON array of 3 strings only."}],
            system="Respond only with a valid JSON array of 3 short question strings.",
        )
        followups = json.loads(followups_raw.strip())
    except Exception:
        followups = []

    # Background: save history, trace, eval
    asyncio.create_task(_post_turn(req.session_id, req.query, response_text, reranked, latency_ms))

    eval_scores: dict = {}
    yield f"data: {json.dumps({'type': 'done', 'eval_scores': eval_scores, 'follow_ups': followups})}\n\n"


async def _post_turn(session_id: str, query: str, response: str, chunks: list[dict], latency_ms: float):
    await append_turn(session_id, query, response)
    try:
        trace_id = create_rag_trace(session_id, query, chunks, response, latency_ms)
        scores = await evaluate(query, chunks, response)
        # Store to DB
        from core.database import AsyncSessionLocal
        from models.eval import EvalTrace
        async with AsyncSessionLocal() as db:
            db.add(EvalTrace(
                session_id=session_id,
                query=query,
                response=response,
                retrieved_chunks=[{"text": c["text"][:200], "title": c["title"], "page_num": c["page_num"]} for c in chunks],
                faithfulness=scores.get("faithfulness"),
                answer_relevance=scores.get("answer_relevance"),
                latency_ms=latency_ms,
                langfuse_trace_id=trace_id,
            ))
            await db.commit()
    except Exception:
        pass


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    return StreamingResponse(
        _rag_stream(req),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/compare")
async def compare_papers(req: CompareRequest):
    from sqlalchemy import select
    from models.paper import Paper
    from core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Paper).where(Paper.id.in_([int(p) for p in req.paper_ids])))
        papers = result.scalars().all()

    summary = "\n\n".join(
        f"Paper: {p.title}\nAuthors: {p.authors}\nAbstract: {p.abstract[:500]}"
        for p in papers
    )
    messages = build_comparison_prompt(summary, req.aspect)

    async def stream():
        async for token in stream_response(messages, SYSTEM_PROMPT):
            yield f"data: {json.dumps({'type': 'delta', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
