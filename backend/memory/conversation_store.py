import json
from core.redis_client import get_redis
from core.config import settings

SESSION_TTL = 3600 * 24  # 24 hours


async def get_history(session_id: str) -> list[dict]:
    redis = await get_redis()
    raw = await redis.get(f"session:{session_id}:history")
    if not raw:
        return []
    return json.loads(raw)


async def append_turn(session_id: str, user_msg: str, assistant_msg: str):
    redis = await get_redis()
    history = await get_history(session_id)
    history.append({"role": "user", "content": user_msg})
    history.append({"role": "assistant", "content": assistant_msg})
    # Keep only last N turns
    max_messages = settings.max_conversation_turns * 2
    if len(history) > max_messages:
        history = history[-max_messages:]
    await redis.setex(f"session:{session_id}:history", SESSION_TTL, json.dumps(history))


async def clear_session(session_id: str):
    redis = await get_redis()
    await redis.delete(f"session:{session_id}:history")
