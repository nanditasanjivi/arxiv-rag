'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useChat } from '@/hooks/useChat'
import { ChatMessage, Citation } from '@/lib/types'

function MessageBubble({ msg, onCitationClick }: { msg: ChatMessage; onCitationClick: (c: Citation) => void }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
        isUser ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-800'
      }`}>
        <div className="prose whitespace-pre-wrap leading-relaxed">{msg.content}</div>
        {msg.citations && msg.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
            {msg.citations.map((c, i) => (
              <button
                key={i}
                onClick={() => onCitationClick(c)}
                className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200 hover:bg-brand-100"
              >
                {c.title.slice(0, 30)}... p.{c.page_num}
              </button>
            ))}
          </div>
        )}
        {msg.eval_scores && (msg.eval_scores.faithfulness != null || msg.eval_scores.answer_relevance != null) && (
          <div className="mt-1.5 flex gap-3 text-xs text-gray-400">
            {msg.eval_scores.faithfulness != null && (
              <span>Faithfulness: <span className="font-medium text-green-600">{(msg.eval_scores.faithfulness * 100).toFixed(0)}%</span></span>
            )}
            {msg.eval_scores.answer_relevance != null && (
              <span>Relevance: <span className="font-medium text-blue-600">{(msg.eval_scores.answer_relevance * 100).toFixed(0)}%</span></span>
            )}
          </div>
        )}
        {msg.follow_ups && msg.follow_ups.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Suggested follow-ups:</p>
            <div className="space-y-1">
              {msg.follow_ups.map((q, i) => (
                <button key={i} className="block text-xs text-brand-600 hover:underline text-left">{q}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CitationPanel({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  return (
    <div className="w-80 border-l bg-white h-full overflow-y-auto p-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Source</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
      <p className="font-medium text-sm text-gray-900 mb-1">{citation.title}</p>
      <p className="text-xs text-gray-500 mb-2">{citation.authors}</p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
        <span className="font-medium text-amber-700">Page {citation.page_num}:</span>
        <p className="mt-1">"{citation.text}"</p>
      </div>
      <a
        href={`https://arxiv.org/abs/${citation.arxiv_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block text-xs text-brand-600 hover:underline"
      >
        View on arXiv →
      </a>
    </div>
  )
}

export default function ChatPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const paperIds = (searchParams.get('papers') || '').split(',').filter(Boolean)

  const { messages, isStreaming, sendMessage, stop } = useChat(sessionId, paperIds)
  const [input, setInput] = useState('')
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mt-6 -mx-4">
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b bg-white px-4 py-2.5 text-sm text-gray-500">
          Session: <span className="font-mono text-xs">{sessionId.slice(0, 8)}...</span>
          {paperIds.length > 0 && <span className="ml-2">· {paperIds.length} paper{paperIds.length > 1 ? 's' : ''} loaded</span>}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-lg font-medium mb-2">Papers loaded. Ask anything.</p>
              <p className="text-sm">Try: "What is the main contribution of these papers?" or "Explain the methodology."</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} onCitationClick={setActiveCitation} />
          ))}
          {isStreaming && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t bg-white px-4 py-3 flex gap-2">
          <input
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Ask a question about the papers..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button onClick={stop} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium">Stop</button>
          ) : (
            <button onClick={submit} disabled={!input.trim()} className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">Send</button>
          )}
        </div>
      </div>

      {/* Citation sidebar */}
      {activeCitation && (
        <CitationPanel citation={activeCitation} onClose={() => setActiveCitation(null)} />
      )}
    </div>
  )
}
