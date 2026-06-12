from datetime import datetime
from sqlalchemy import String, Text, Float, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from core.database import Base


class EvalTrace(Base):
    __tablename__ = "eval_traces"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    query: Mapped[str] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    retrieved_chunks: Mapped[list] = mapped_column(JSON)
    faithfulness: Mapped[float | None] = mapped_column(Float, nullable=True)
    answer_relevance: Mapped[float | None] = mapped_column(Float, nullable=True)
    context_recall: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    langfuse_trace_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
