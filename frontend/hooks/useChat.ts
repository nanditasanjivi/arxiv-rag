'use client'
import { useState, useCallback, useRef } from 'react'
import { ChatMessage, Citation, EvalScores } from '@/lib/types'
import { api } from '@/lib/api'

export function useChat(sessionId: string, paperIds: string[]) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (query: string) => {
    if (isStreaming) return

    const userMsg: ChatMessage = { role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])

    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])
    setIsStreaming(true)

    abortRef.current = new AbortController()

    try {
      console.log('Fetching:', api.chatStreamUrl())
      console.log('Payload:', { session_id: sessionId, query, paper_ids: paperIds.length ? paperIds : null })
      const res = await fetch(api.chatStreamUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, query, paper_ids: paperIds.length ? paperIds : null }),
        signal: abortRef.current.signal,
      })
      console.log('Response status:', res.status, res.ok)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith(': ')) continue // skip keepalive comments
          if (!line.startsWith('data: ')) continue
          console.log('SSE line:', line)
          try {
            const event = JSON.parse(line.slice(6))
            console.log('SSE event:', event)
            if (event.type === 'delta') {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + event.content,
                }
                return updated
              })
            } else if (event.type === 'citations') {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { ...updated[updated.length - 1], citations: event.sources }
                return updated
              })
            } else if (event.type === 'done') {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  eval_scores: event.eval_scores,
                  follow_ups: event.follow_ups,
                }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (e: any) {
      console.error('Chat error:', e)
      if (e.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Error: ' + e.message }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, sessionId, paperIds])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  return { messages, isStreaming, sendMessage, stop }
}
