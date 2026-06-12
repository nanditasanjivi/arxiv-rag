from generation.claude_client import complete

FAITHFULNESS_PROMPT = """Given a question, a context, and an answer, rate how faithful the answer is to the context.
A faithful answer only makes claims that are supported by the context.

Question: {question}
Context: {context}
Answer: {answer}

Rate faithfulness from 0.0 to 1.0. Respond with ONLY a number."""

RELEVANCE_PROMPT = """Given a question and an answer, rate how relevant the answer is to the question.

Question: {question}
Answer: {answer}

Rate relevance from 0.0 to 1.0. Respond with ONLY a number."""


async def evaluate(query: str, context_chunks: list[dict], response: str) -> dict[str, float]:
    context = "\n\n".join(c["text"] for c in context_chunks[:3])

    scores = {}
    try:
        faith_raw = await complete(
            messages=[{"role": "user", "content": FAITHFULNESS_PROMPT.format(
                question=query, context=context[:3000], answer=response[:1000]
            )}],
            system="You are an evaluation assistant. Respond with only a decimal number between 0 and 1.",
        )
        scores["faithfulness"] = min(1.0, max(0.0, float(faith_raw.strip())))
    except Exception:
        scores["faithfulness"] = None

    try:
        rel_raw = await complete(
            messages=[{"role": "user", "content": RELEVANCE_PROMPT.format(
                question=query, answer=response[:1000]
            )}],
            system="You are an evaluation assistant. Respond with only a decimal number between 0 and 1.",
        )
        scores["answer_relevance"] = min(1.0, max(0.0, float(rel_raw.strip())))
    except Exception:
        scores["answer_relevance"] = None

    return scores
