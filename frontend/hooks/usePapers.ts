'use client'
import { useState, useEffect, useCallback } from 'react'
import { Paper } from '@/lib/types'
import { api } from '@/lib/api'

export function usePapers() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listPapers()
      setPapers(data.papers)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const deletePaper = useCallback(async (arxiv_id: string) => {
    await api.deletePaper(arxiv_id)
    await refresh()
  }, [refresh])

  return { papers, loading, refresh, deletePaper }
}
