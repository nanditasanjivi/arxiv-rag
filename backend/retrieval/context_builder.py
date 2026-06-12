def build_context(chunks: list[dict]) -> tuple[str, list[dict]]:
    """Returns (formatted_context_string, sources_list)"""
    context_parts = []
    sources = []
    for i, chunk in enumerate(chunks):
        ref = f"[{chunk['title'][:50]}, p.{chunk['page_num']}]"
        context_parts.append(f"Source {i + 1} {ref}:\n{chunk['text']}")
        sources.append({
            "ref": ref,
            "paper_id": chunk["paper_id"],
            "arxiv_id": chunk["arxiv_id"],
            "title": chunk["title"],
            "authors": chunk["authors"],
            "page_num": chunk["page_num"],
            "text": chunk["text"][:300],
        })
    return "\n\n---\n\n".join(context_parts), sources
