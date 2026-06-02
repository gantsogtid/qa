'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, type Question } from '@/lib/supabase'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
const BG     = ['#fefce8', '#f8fafc', '#fff7ed', '#fff', '#fff']
const BORDER = ['#fde047', '#cbd5e1', '#fdba74', '#e2e8f0', '#e2e8f0']
const BAR    = ['#eab308', '#64748b', '#f97316', '#0ea5e9', '#0ea5e9']

export default function TopPage() {
  const [top, setTop] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [totalLikes, setTotalLikes] = useState(0)

  const fetch = useCallback(async () => {
    const [{ data: qs }, { count }, { data: all }] = await Promise.all([
      supabase.from('questions').select('*').order('likes', { ascending: false }).limit(5),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('likes'),
    ])
    setTop(qs || [])
    setTotal(count || 0)
    setTotalLikes((all || []).reduce((s, q) => s + q.likes, 0))
  }, [])

  useEffect(() => {
    fetch()
    const ch = supabase.channel('top-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetch])

  const maxLikes = top[0]?.likes || 1

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)',
        padding: '1.75rem 1.25rem 3rem',
        color: '#fff',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>⭐ Топ 5 асуулт</h1>
        <p style={{ fontSize: 14, opacity: .8 }}>Хамгийн их санал авсан асуулт</p>
      </div>

      <div style={{ maxWidth: 600, margin: '-1.5rem auto 0', padding: '0 1rem 1rem' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
          {[
            { n: total, label: 'Нийт асуулт', color: '#0ea5e9' },
            { n: totalLikes, label: 'Нийт санал', color: '#1d4ed8' },
            { n: top.length, label: 'Топ асуулт', color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: '#fff', borderRadius: 16,
              padding: '12px 8px', textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,.07)',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.n}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {top.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 0', fontSize: 14 }}>
            Одоохондоо асуулт байхгүй байна
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top.map((q, i) => (
            <div key={q.id} style={{
              background: BG[i],
              border: `2px solid ${BORDER[i]}`,
              borderRadius: 16,
              padding: '1rem 1.25rem',
              boxShadow: i === 0 ? '0 4px 20px rgba(234,179,8,.15)' : '0 2px 8px rgba(0,0,0,.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 10 }}>
                <span style={{ fontSize: 30, flexShrink: 0, lineHeight: 1 }}>{MEDALS[i]}</span>
                <p style={{ flex: 1, fontSize: 15, fontWeight: i < 3 ? 600 : 400, lineHeight: 1.6, color: '#1e293b' }}>
                  {q.text}
                </p>
                <div style={{
                  flexShrink: 0, textAlign: 'center',
                  background: '#fff', borderRadius: 10,
                  padding: '8px 14px', border: `1px solid ${BORDER[i]}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>{q.likes}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>санал</div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: 'rgba(0,0,0,.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${maxLikes > 0 ? Math.round((q.likes / maxLikes) * 100) : 0}%`,
                  background: BAR[i],
                  borderRadius: 4,
                  transition: 'width .6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: '1.5rem' }}>
          ↻ Шинэчлэлт автоматаар харагдана
        </p>
      </div>
    </div>
  )
}
