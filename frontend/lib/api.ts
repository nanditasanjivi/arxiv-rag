const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  searchPapers: (query: string, max_results = 10) =>
    req<{ papers: any[] }>('/api/papers/search', {
      method: 'POST',
      body: JSON.stringify({ query, max_results }),
    }),

  ingestPapers: (arxiv_ids: string[]) =>
    req<{ job_id: string; status: string }>('/api/papers/ingest', {
      method: 'POST',
      body: JSON.stringify({ arxiv_ids }),
    }),

  getIngestStatus: (job_id: string) =>
    req<{ status: string; progress: number; errors: any[] }>(`/api/papers/ingest/status/${job_id}`),

  listPapers: () => req<{ papers: any[] }>('/api/papers'),

  deletePaper: (arxiv_id: string) =>
    req<{ status: string }>(`/api/papers/${arxiv_id}`, { method: 'DELETE' }),

  getHistory: (session_id: string) =>
    req<{ messages: any[] }>(`/api/sessions/${session_id}/history`),

  getEvalMetrics: () => req<any>('/api/eval/metrics'),

  chatStreamUrl: () => `${API}/api/chat/stream`,
}
