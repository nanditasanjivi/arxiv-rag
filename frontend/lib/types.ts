export interface Paper {
  id?: number
  arxiv_id: string
  title: string
  abstract: string
  authors: string
  year: number
  pdf_url?: string
  ingested_at?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  eval_scores?: EvalScores
  follow_ups?: string[]
}

export interface Citation {
  ref: string
  paper_id: string
  arxiv_id: string
  title: string
  authors: string
  page_num: number
  text: string
}

export interface EvalScores {
  faithfulness?: number
  answer_relevance?: number
}

export interface EvalTrace {
  id: number
  query: string
  faithfulness: number | null
  answer_relevance: number | null
  latency_ms: number | null
  langfuse_trace_id: string | null
  created_at: string
}

export interface EvalMetrics {
  averages: {
    faithfulness: number | null
    answer_relevance: number | null
    avg_latency_ms: number | null
    total_queries: number
  }
  traces: EvalTrace[]
}
