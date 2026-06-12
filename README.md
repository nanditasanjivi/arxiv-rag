# arXiv Research RAG

> Chat with arXiv research papers — powered by Claude, Voyage AI, and Pinecone.

A production-grade RAG (Retrieval-Augmented Generation) system that demonstrates end-to-end data engineering, machine learning, and AI engineering skills.

**Live demo:** _link goes here after deploy_

---

## Architecture

```
Browser → Next.js (Vercel) → FastAPI (Railway)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
                Pinecone      Anthropic API    Voyage AI
            (vector store)   (Claude Sonnet)  (embeddings)
                    │               │               │
                PostgreSQL      Langfuse         Cohere
              (metadata DB)   (observability)  (reranking)
                Redis
          (conversation memory)
```

## Features

| Feature | Tech |
|---|---|
| arXiv paper search + ingestion | `arxiv` Python library + PyMuPDF |
| Semantic chunking | LangChain RecursiveCharacterTextSplitter |
| Embeddings | Voyage AI voyage-3-lite (512-dim) |
| Vector search | Pinecone (cosine similarity, top-20) |
| Reranking | Cohere rerank-english-v3.0 (top-5) |
| Streaming chat | Claude Sonnet 4.6 via Anthropic API (SSE) |
| Page-level citations | Tracked from PDF parse → vector metadata → response |
| Conversation memory | Redis sliding window (last 10 turns) |
| Eval metrics | RAGAS-style faithfulness + relevance (Claude Haiku judge) |
| Observability | Langfuse traces (retrieval + generation spans) |
| Multi-paper comparison | Structured comparison via Claude |
| Prompt caching | Anthropic `cache_control: ephemeral` for cost reduction |

## Stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** FastAPI (Python 3.11), SQLAlchemy, asyncpg
- **AI:** Claude Sonnet 4.6 (chat), Claude Haiku 4.5 (eval judge)
- **Embeddings:** Voyage AI voyage-3-lite
- **Vector DB:** Pinecone (free tier)
- **Reranker:** Cohere rerank-english-v3.0
- **Observability:** Langfuse
- **Deploy:** Vercel (frontend) + Railway (backend + PostgreSQL + Redis)

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for local Postgres + Redis)

### 1. Clone and set up backend

```bash
cd backend
cp .env.example .env
# Fill in all API keys in .env

pip install -r requirements.txt
```

### 2. Start local services

```bash
cd infrastructure
docker-compose up postgres redis -d
```

### 3. Run backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 4. Run frontend

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm install
npm run dev
```

Open http://localhost:3000

---

## Deployment

### Backend → Railway

1. Create Railway project at railway.app
2. Add PostgreSQL and Redis addons
3. Connect GitHub repo, set root directory to `backend/`
4. Add all environment variables from `.env.example`
5. Railway auto-detects Dockerfile and deploys

### Frontend → Vercel

1. Import repo at vercel.com
2. Set root directory to `frontend/`
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
4. Deploy

---

## API Keys Needed (all free tiers)

| Service | Get key at | Free tier |
|---|---|---|
| Anthropic | console.anthropic.com | Pay-as-you-go (cheap) |
| Voyage AI | dash.voyageai.com | 50M tokens/month |
| Pinecone | app.pinecone.io | 2GB, 1 index |
| Cohere | dashboard.cohere.com | 1000 rerank calls/month |
| Langfuse | cloud.langfuse.com | 10k traces/month |

---

## Design Decisions

**Why Voyage AI over OpenAI embeddings?** Voyage is Anthropic-invested and produces superior embeddings for scientific/technical text. voyage-3-lite is free for 50M tokens/month.

**Why SSE over WebSockets?** SSE is stateless, unidirectional, works through Vercel's edge network without special configuration, and is sufficient for streaming LLM responses.

**Why Haiku as the eval judge?** RAGAS-style evaluation requires many LLM calls per query. Using Claude Haiku 4.5 (vs Sonnet) reduces eval cost by ~10x while maintaining sufficient quality for faithfulness/relevance scoring.

**Prompt caching:** System prompt + retrieved context uses `cache_control: {type: "ephemeral"}` which reduces cost by up to 90% for repeated similar queries on the same papers.

**Page-level citations:** Every chunk tracks its source page number through the full pipeline — PDF parsing → LangChain chunking → Pinecone metadata → response citation extraction. This enables precise "Paper Title, p.7" style references.
