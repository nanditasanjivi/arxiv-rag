'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Paper } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Paper[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [ingesting, setIngesting] = useState(false)
  const [ingestProgress, setIngestProgress] = useState(0)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await api.searchPapers(query, 10)
      setResults(data.papers)
    } catch (e: any) {
      alert('Search failed: ' + e.message)
    }
    setSearching(false)
  }

  const toggleSelect = (arxiv_id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(arxiv_id) ? next.delete(arxiv_id) : next.add(arxiv_id)
      return next
    })
  }

  const ingestAndChat = async () => {
    if (selected.size === 0) return
    setIngesting(true)
    try {
      const { job_id } = await api.ingestPapers([...selected])
      // Poll for completion
      while (true) {
        await new Promise(r => setTimeout(r, 1500))
        const status = await api.getIngestStatus(job_id)
        setIngestProgress(status.progress)
        if (status.status === 'complete') break
      }
      const sessionId = uuidv4()
      router.push(`/chat/${sessionId}?papers=${[...selected].join(',')}`)
    } catch (e: any) {
      alert('Ingestion failed: ' + e.message)
    }
    setIngesting(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Chat with arXiv Papers</h1>
        <p className="text-gray-500 text-lg">Search for research papers, ingest them, and have an AI-powered conversation backed by real citations.</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="e.g. attention mechanism transformers, diffusion models..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button
          onClick={search}
          disabled={searching}
          className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search arXiv'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-500">Select papers to ingest and chat with:</p>
          {results.map(paper => (
            <div
              key={paper.arxiv_id}
              onClick={() => toggleSelect(paper.arxiv_id)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selected.has(paper.arxiv_id)
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  readOnly
                  checked={selected.has(paper.arxiv_id)}
                  className="mt-1 accent-brand-500"
                />
                <div>
                  <h3 className="font-medium text-gray-900 text-sm leading-snug">{paper.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{paper.authors} · {paper.year} · {paper.arxiv_id}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{paper.abstract}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ingest + Chat button */}
      {selected.size > 0 && (
        <div className="sticky bottom-4">
          <button
            onClick={ingestAndChat}
            disabled={ingesting}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg disabled:opacity-60"
          >
            {ingesting
              ? `Ingesting papers... ${Math.round(ingestProgress * 100)}%`
              : `Ingest ${selected.size} paper${selected.size > 1 ? 's' : ''} and Start Chat`}
          </button>
        </div>
      )}
    </div>
  )
}
