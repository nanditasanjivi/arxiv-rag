import re


def extract_cited_refs(response_text: str, sources: list[dict]) -> list[dict]:
    """Return only the sources that were actually cited in the response."""
    cited = []
    seen = set()
    for source in sources:
        ref = source["ref"]
        # Match the citation text (flexible for slight truncation)
        title_fragment = source["title"][:30]
        if title_fragment.lower() in response_text.lower() and source["arxiv_id"] not in seen:
            cited.append(source)
            seen.add(source["arxiv_id"])
    return cited
