from dataclasses import dataclass
import fitz  # PyMuPDF


@dataclass
class PageText:
    page_num: int
    text: str


def parse_pdf(pdf_bytes: bytes) -> list[PageText]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for page_num, page in enumerate(doc):
        text = page.get_text("text").strip()
        if text:
            pages.append(PageText(page_num=page_num + 1, text=text))
    doc.close()
    return pages
