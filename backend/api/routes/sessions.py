from fastapi import APIRouter
from memory.conversation_store import get_history, clear_session

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/{session_id}/history")
async def get_session_history(session_id: str):
    history = await get_history(session_id)
    return {"session_id": session_id, "messages": history}


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    await clear_session(session_id)
    return {"status": "cleared"}
