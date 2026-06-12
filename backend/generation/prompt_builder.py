SYSTEM_PROMPT = """You are an expert research assistant specializing in scientific papers. Your job is to answer questions based ONLY on the provided research paper excerpts.

Rules:
- Answer using only the information in the provided sources
- Cite every claim with the source reference in the format already shown, e.g. [Paper Title, p.3]
- If the answer is not in the provided context, explicitly say "This information is not covered in the ingested papers"
- Be precise, technical, and thorough
- When comparing multiple papers, structure your response clearly"""


def build_chat_prompt(context: str, history: list[dict], query: str) -> list[dict]:
    messages = list(history)
    user_content = f"""Research paper excerpts:

{context}

---

Question: {query}"""
    messages.append({"role": "user", "content": user_content})
    return messages


def build_comparison_prompt(papers_summary: str, aspect: str) -> list[dict]:
    return [{"role": "user", "content": f"""Compare the following papers on the aspect: "{aspect}"

{papers_summary}

Provide a structured comparison with:
1. A summary table
2. Key similarities
3. Key differences
4. Which approach is stronger and why

Cite specific claims with source references."""}]
