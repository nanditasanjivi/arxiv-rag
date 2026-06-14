from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Anthropic
    anthropic_api_key: str
    claude_chat_model: str = "claude-sonnet-4-6"
    claude_eval_model: str = "claude-haiku-4-5-20251001"

    # Voyage AI
    voyage_api_key: str
    voyage_model: str = "voyage-3-lite"
    embedding_dim: int = 512

    # Pinecone
    pinecone_api_key: str
    pinecone_index: str = "arxiv-rag"

    # Cohere
    cohere_api_key: str

    # Langfuse
    langfuse_secret_key: str
    langfuse_public_key: str
    langfuse_host: str = "https://cloud.langfuse.com"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/arxiv_rag"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/arxiv_rag"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # App
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000", "https://arxiv-rag.vercel.app", "https://*.vercel.app"]
    max_conversation_turns: int = 10
    retrieval_top_k: int = 20
    rerank_top_k: int = 5


settings = Settings()
