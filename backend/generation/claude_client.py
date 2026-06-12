from anthropic import AsyncAnthropic
from core.config import settings

_client: AsyncAnthropic | None = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def stream_response(messages: list[dict], system: str, model: str | None = None):
    client = get_client()
    model = model or settings.claude_chat_model
    async with client.messages.stream(
        model=model,
        max_tokens=2048,
        system=[
            {
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"},  # prompt caching for cost savings
            }
        ],
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def complete(messages: list[dict], system: str, model: str | None = None) -> str:
    client = get_client()
    model = model or settings.claude_eval_model
    response = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system,
        messages=messages,
    )
    return response.content[0].text
