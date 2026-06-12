from dataclasses import dataclass
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ingestion.pdf_parser import PageText


@dataclass
class Chunk:
    text: str
    page_num: int
    chunk_index: int


def chunk_pages(pages: list[PageText], chunk_size: int = 800, chunk_overlap: int = 100) -> list[Chunk]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = []
    global_index = 0
    for page in pages:
        texts = splitter.split_text(page.text)
        for text in texts:
            if text.strip():
                chunks.append(Chunk(text=text.strip(), page_num=page.page_num, chunk_index=global_index))
                global_index += 1
    return chunks
