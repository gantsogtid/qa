'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, type Question } from '@/lib/supabase'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
const COLORS = ['#fef9c3', '#f1f5f9', '#fff7ed', '#f9fafb', '#f9fafb']
const BORDERS = ['#fde047', '#cbd5e1', '#fdba74', '#e5e5e5', '#e5e5e5']

export default function TopPage() {
  const [top, setTop] = useState<Question[]>([])
  const [total, setTotal] = useState(0)

  const fetch = useCallback(async () => {
    const [{ data: qs }, { count }] = await Promise.all([
      supabase.from('questions').select('*').order('likes', { ascending: false }).limit(5),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
    ])
    setTop(qs || [])
    setTotal(count || 0)
  }, [])

  useEffect(() => {
    fetch()
    const ch = supabase.channel('top-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetch])

  return (
    <>
      <nav>
        <span className="brand">Q&amp;A</span>
        <a href="/display">Дэлгэц</a>
        <a href="/questions">Асуулт</a>
        <a href="/top" className="active">Топ 5</a>
        <a href="/admin">Ирц</a>
      </nav>

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>Хамгийн их дэмжлэг авсан асуулт</h1>
          <p style={{ fontSize: 14, color: '#666', marginTop: 6 }}>Нийт {total} асуултаас топ 5</p>
        </div>

        {top.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', padding: '3rem 0' }}>Одоохондоо асуулт байхгүй байна</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {top.map((q, i) => (
            <div key={q.id} style={{
              background: COLORS[i],
              border: `2px solid ${BORDERS[i]}`,
              borderRadius: 14,
              padding: '1.25rem 1.5rem',
              display: 'flex', alignItems: 'center', gap: 16
            }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{MEDALS[i]}</span>
              <p style={{ flex: 1, fontSize: 16, fontWeight: i === 0 ? 600 : 400, lineHeight: 1.6, color: '#1a1a1a' }}>
                {q.text}
              </p>
              <div style={{
                flexShrink: 0, textAlign: 'center',
                background: '#fff', borderRadius: 10,
                padding: '8px 14px', border: `1px solid ${BORDERS[i]}`
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>{q.likes}</div>
                <div style={{ fontSize: 11, color: '#999' }}>like</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: '2rem' }}>
          Шинэчлэлт автоматаар харагдана
        </p>
      </div>
    </>
  )
}
