'use client'
import { usePapers } from '@/hooks/usePapers'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export default function PapersPage() {
  const { papers, loading, refresh, deletePaper } = usePapers()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const router = useRouter()

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const chatWithSelected = () => {
    if (selected.size === 0) return
    const sessionId = uuidv4()
    router.push(`/chat/${sessionId}?papers=${[...selected].join(',')}`)
  }

  if (loading) return <div className="text-center text-gray-400 py-20">Loading library...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Paper Library</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={chatWithSelected} className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Chat with {selected.size} selected
            </button>
          )}
          <button onClick={refresh} className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {papers.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <p className="text-lg">No papers ingested yet.</p>
          <a href="/" className="text-brand-600 hover:underline text-sm mt-2 block">Search and ingest papers</a>
        </div>
      ) : (
        <div className="grid gap-3">
          {papers.map(paper => (
            <div
              key={paper.arxiv_id}
              className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                selected.has(String(paper.id)) ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggle(String(paper.id))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <input type="checkbox" readOnly checked={selected.has(String(paper.id))} className="mt-1 accent-brand-500" />
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{paper.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{paper.authors} · {paper.year} · {paper.arxiv_id}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{paper.abstract}</p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deletePaper(paper.arxiv_id) }}
                  className="text-gray-300 hover:text-red-500 text-lg leading-none flex-shrink-0"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
