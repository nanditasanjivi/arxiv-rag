from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    arxiv_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(Text)
    abstract: Mapped[str] = mapped_column(Text)
    authors: Mapped[str] = mapped_column(Text)  # comma-separated
    year: Mapped[int] = mapped_column(Integer)
    pdf_url: Mapped[str] = mapped_column(Text)
    ingested_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    chunks: Mapped[list["Chunk"]] = relationship("Chunk", back_populates="paper", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    paper_id: Mapped[int] = mapped_column(Integer, ForeignKey("papers.id"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    page_num: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    pinecone_id: Mapped[str] = mapped_column(String(200), unique=True)

    paper: Mapped["Paper"] = relationship("Paper", back_populates="chunks")
