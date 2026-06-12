import arxiv
import httpx
from dataclasses import dataclass


@dataclass
class ArxivPaper:
    arxiv_id: str
    title: str
    abstract: str
    authors: str
    year: int
    pdf_url: str


async def search_papers(query: str, max_results: int = 10) -> list[ArxivPaper]:
    client = arxiv.Client()
    search = arxiv.Search(query=query, max_results=max_results, sort_by=arxiv.SortCriterion.Relevance)
    papers = []
    for result in client.results(search):
        papers.append(ArxivPaper(
            arxiv_id=result.entry_id.split("/abs/")[-1],
            title=result.title,
            abstract=result.summary,
            authors=", ".join(a.name for a in result.authors[:5]),
            year=result.published.year,
            pdf_url=result.pdf_url,
        ))
    return papers


async def download_pdf(pdf_url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(pdf_url)
        response.raise_for_status()
        return response.content
