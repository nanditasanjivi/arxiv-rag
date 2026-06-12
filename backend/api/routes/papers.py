import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from core.database import get_db
from ingestion.arxiv_client import search_papers, ArxivPaper
from ingestion.pipeline import ingest_papers, get_job
from models.paper import Paper

router = APIRouter(prefix="/api/papers", tags=["papers"])


class SearchRequest(BaseModel):
    query: str
    max_results: int = 10


class IngestRequest(BaseModel):
    arxiv_ids: list[str]


@router.post("/search")
async def search(req: SearchRequest):
    papers = await search_papers(req.query, req.max_results)
    return {"papers": [p.__dict__ for p in papers]}


@router.post("/ingest")
async def ingest(req: IngestRequest, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Fetch metadata for requested arxiv_ids
    papers_to_ingest = []
    for arxiv_id in req.arxiv_ids:
        results = await search_papers(f"id:{arxiv_id}", max_results=1)
        if results:
            papers_to_ingest.append(results[0])

    if not papers_to_ingest:
        raise HTTPException(status_code=404, detail="No papers found for given IDs")

    job_id = str(uuid.uuid4())
    background.add_task(ingest_papers, job_id, papers_to_ingest)
    return {"job_id": job_id, "status": "queued", "paper_count": len(papers_to_ingest)}


@router.get("/ingest/status/{job_id}")
async def ingest_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("")
async def list_papers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Paper).order_by(Paper.ingested_at.desc()))
    papers = result.scalars().all()
    return {"papers": [
        {
            "id": p.id,
            "arxiv_id": p.arxiv_id,
            "title": p.title,
            "authors": p.authors,
            "year": p.year,
            "abstract": p.abstract[:300],
            "ingested_at": p.ingested_at.isoformat(),
        }
        for p in papers
    ]}


@router.delete("/{arxiv_id}")
async def delete_paper(arxiv_id: str, db: AsyncSession = Depends(get_db)):
    from retrieval.vector_store import delete_paper as pinecone_delete
    result = await db.execute(select(Paper).where(Paper.arxiv_id == arxiv_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    pinecone_delete(arxiv_id)
    await db.delete(paper)
    return {"status": "deleted"}
