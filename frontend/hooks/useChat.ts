'use client'
import { useState, useCallback, useRef } from 'react'
import { ChatMessage, Citation } from '@/lib/types'
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
      const res = await fetch(api.chatStreamUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, query, paper_ids: paperIds.length ? paperIds : null }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)

      const data = await res.json()

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: data.content,
          citations: data.citations || [],
          eval_scores: data.eval_scores || {},
          follow_ups: data.follow_ups || [],
        }
        return updated
      })

    } catch (e: any) {
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
