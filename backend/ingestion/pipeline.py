import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ingestion.arxiv_client import ArxivPaper, download_pdf
from ingestion.pdf_parser import parse_pdf
from ingestion.chunker import chunk_pages
from ingestion.embedder import embed_texts
from retrieval.vector_store import upsert_chunks
from models.paper import Paper, Chunk
from core.database import AsyncSessionLocal

# In-memory job status store (Railway restarts clear it — fine for portfolio)
_jobs: dict[str, dict] = {}


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


async def ingest_papers(job_id: str, papers: list[ArxivPaper]):
    _jobs[job_id] = {"status": "processing", "progress": 0.0, "paper_count": len(papers), "errors": []}

    for i, paper in enumerate(papers):
        try:
            async with AsyncSessionLocal() as db:
                # Skip if already ingested
                existing = await db.execute(select(Paper).where(Paper.arxiv_id == paper.arxiv_id))
                if existing.scalar_one_or_none():
                    _jobs[job_id]["progress"] = (i + 1) / len(papers)
                    continue

                # Download + parse PDF
                pdf_bytes = await download_pdf(paper.pdf_url)
                pages = parse_pdf(pdf_bytes)
                chunks = chunk_pages(pages)

                if not chunks:
                    continue

                # Embed all chunks
                texts = [c.text for c in chunks]
                embeddings = await embed_texts(texts)

                # Store paper to PostgreSQL
                db_paper = Paper(
                    arxiv_id=paper.arxiv_id,
                    title=paper.title,
                    abstract=paper.abstract,
                    authors=paper.authors,
                    year=paper.year,
                    pdf_url=paper.pdf_url,
                )
                db.add(db_paper)
                await db.flush()  # get db_paper.id

                # Build Pinecone vectors + DB chunks
                vectors = []
                for chunk, embedding in zip(chunks, embeddings):
                    pinecone_id = f"{paper.arxiv_id}__chunk_{chunk.chunk_index}"
                    vectors.append({
                        "id": pinecone_id,
                        "values": embedding,
                        "metadata": {
                            "paper_id": str(db_paper.id),
                            "arxiv_id": paper.arxiv_id,
                            "title": paper.title,
                            "authors": paper.authors,
                            "page_num": chunk.page_num,
                            "text": chunk.text[:1000],
                        },
                    })
                    db.add(Chunk(
                        paper_id=db_paper.id,
                        chunk_index=chunk.chunk_index,
                        page_num=chunk.page_num,
                        text=chunk.text,
                        pinecone_id=pinecone_id,
                    ))

                upsert_chunks(vectors)
                await db.commit()

        except Exception as e:
            _jobs[job_id]["errors"].append({"arxiv_id": paper.arxiv_id, "error": str(e)})

        _jobs[job_id]["progress"] = (i + 1) / len(papers)

    _jobs[job_id]["status"] = "complete"
