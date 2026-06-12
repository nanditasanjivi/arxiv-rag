'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { EvalMetrics } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function ScoreGauge({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value != null ? Math.round(value * 100) : null
  return (
    <div className="bg-white border rounded-xl p-5 text-center">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      {pct != null ? (
        <>
          <div className={`text-4xl font-bold ${color}`}>{pct}%</div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all`} style={{ width: `${pct}%`, backgroundColor: color.includes('green') ? '#22c55e' : '#3b82f6' }} />
          </div>
        </>
      ) : <div className="text-3xl font-bold text-gray-300">—</div>}
    </div>
  )
}

export default function EvalPage() {
  const [metrics, setMetrics] = useState<EvalMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getEvalMetrics().then(data => { setMetrics(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-gray-400 py-20">Loading metrics...</div>
  if (!metrics) return <div className="text-center text-red-400 py-20">Failed to load metrics.</div>

  const chartData = [...metrics.traces].reverse().map((t, i) => ({
    index: i + 1,
    faithfulness: t.faithfulness != null ? +(t.faithfulness * 100).toFixed(1) : null,
    relevance: t.answer_relevance != null ? +(t.answer_relevance * 100).toFixed(1) : null,
    latency: t.latency_ms != null ? +(t.latency_ms / 1000).toFixed(2) : null,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Eval Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <ScoreGauge label="Avg Faithfulness" value={metrics.averages.faithfulness} color="text-green-600" />
        <ScoreGauge label="Avg Relevance" value={metrics.averages.answer_relevance} color="text-blue-600" />
        <div className="bg-white border rounded-xl p-5 text-center">
          <p className="text-sm text-gray-500 mb-2">Avg Latency</p>
          <div className="text-4xl font-bold text-purple-600">
            {metrics.averages.avg_latency_ms != null ? `${(metrics.averages.avg_latency_ms / 1000).toFixed(1)}s` : '—'}
          </div>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <p className="text-sm text-gray-500 mb-2">Total Queries</p>
          <div className="text-4xl font-bold text-gray-700">{metrics.averages.total_queries}</div>
        </div>
      </div>

      {/* Time-series chart */}
      {chartData.length > 1 && (
        <div className="bg-white border rounded-xl p-5 mb-8">
          <h2 className="font-semibold text-sm mb-4 text-gray-700">Quality Over Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="index" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="faithfulness" stroke="#22c55e" strokeWidth={2} dot={false} name="Faithfulness" />
              <Line type="monotone" dataKey="relevance" stroke="#3b82f6" strokeWidth={2} dot={false} name="Relevance" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trace table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <h2 className="font-semibold text-sm px-4 py-3 border-b text-gray-700">Recent Traces</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Query</th>
                <th className="px-4 py-2">Faithfulness</th>
                <th className="px-4 py-2">Relevance</th>
                <th className="px-4 py-2">Latency</th>
                <th className="px-4 py-2">Trace</th>
              </tr>
            </thead>
            <tbody>
              {metrics.traces.map(t => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate">{t.query}</td>
                  <td className="px-4 py-2.5 text-center">
                    {t.faithfulness != null ? (
                      <span className={`font-medium ${t.faithfulness >= 0.7 ? 'text-green-600' : 'text-amber-500'}`}>
                        {(t.faithfulness * 100).toFixed(0)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {t.answer_relevance != null ? (
                      <span className={`font-medium ${t.answer_relevance >= 0.7 ? 'text-blue-600' : 'text-amber-500'}`}>
                        {(t.answer_relevance * 100).toFixed(0)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-500">
                    {t.latency_ms != null ? `${(t.latency_ms / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {t.langfuse_trace_id ? (
                      <span className="text-brand-600 font-mono">{t.langfuse_trace_id.slice(0, 8)}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
