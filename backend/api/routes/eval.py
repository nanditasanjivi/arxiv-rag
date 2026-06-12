from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from models.eval import EvalTrace

router = APIRouter(prefix="/api/eval", tags=["eval"])


@router.get("/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EvalTrace).order_by(EvalTrace.created_at.desc()).limit(100)
    )
    traces = result.scalars().all()

    if not traces:
        return {"traces": [], "averages": {}}

    faith_scores = [t.faithfulness for t in traces if t.faithfulness is not None]
    rel_scores = [t.answer_relevance for t in traces if t.answer_relevance is not None]
    latencies = [t.latency_ms for t in traces if t.latency_ms is not None]

    return {
        "averages": {
            "faithfulness": sum(faith_scores) / len(faith_scores) if faith_scores else None,
            "answer_relevance": sum(rel_scores) / len(rel_scores) if rel_scores else None,
            "avg_latency_ms": sum(latencies) / len(latencies) if latencies else None,
            "total_queries": len(traces),
        },
        "traces": [
            {
                "id": t.id,
                "query": t.query[:100],
                "faithfulness": t.faithfulness,
                "answer_relevance": t.answer_relevance,
                "latency_ms": t.latency_ms,
                "langfuse_trace_id": t.langfuse_trace_id,
                "created_at": t.created_at.isoformat(),
            }
            for t in traces
        ],
    }
