'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, type AttendanceRow } from '@/lib/supabase'

export default function AdminPage() {
  const [list, setList] = useState<AttendanceRow[]>([])
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('attendance').select('*').order('created_at', { ascending: true })
    setList(data || [])
  }, [])

  useEffect(() => { if (authed) fetch() }, [authed, fetch])

  async function addPerson() {
    if (!name.trim()) return
    setAdding(true)
    await supabase.from('attendance').insert({ name: name.trim() })
    setName('')
    await fetch()
    setAdding(false)
  }

  async function toggleCheckin(id: string, current: boolean) {
    await supabase.from('attendance').update({ checked_in: !current }).eq('id', id)
    await fetch()
  }

  async function deletePerson(id: string) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('attendance').delete().eq('id', id)
    await fetch()
  }

  const filtered = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const totalReg = list.length
  const totalIn = list.filter(p => p.checked_in).length

  if (!authed) {
    return (
      <>
        <nav>
          <span className="brand">Q&amp;A</span>
          <a href="/display">Дэлгэц</a>
          <a href="/questions">Асуулт</a>
          <a href="/top">Топ 5</a>
          <a href="/admin" className="active">Ирц</a>
        </nav>
        <div className="container" style={{ maxWidth: 360, textAlign: 'center', paddingTop: '4rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: 18, fontWeight: 600 }}>Нэвтрэх</h2>
          <input
            type="password"
            placeholder="Нууц үг"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pw === (process.env.NEXT_PUBLIC_ADMIN_PW || 'admin123') && setAuthed(true)}
          />
          <button
            onClick={() => pw === (process.env.NEXT_PUBLIC_ADMIN_PW || 'admin123') && setAuthed(true)}
            style={{ marginTop: 12, padding: '10px 32px', background: '#2563eb', color: '#fff', borderRadius: 8, width: '100%' }}
          >
            Нэвтрэх
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <nav>
        <span className="brand">Q&amp;A</span>
        <a href="/display">Дэлгэц</a>
        <a href="/questions">Асуулт</a>
        <a href="/top">Топ 5</a>
        <a href="/admin" className="active">Ирц</a>
      </nav>

      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
          {[
            { label: 'Нийт бүртгэл', value: totalReg, color: '#1a1a1a' },
            { label: 'Ирсэн', value: totalIn, color: '#16a34a' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <input placeholder="Нэр бичих..." value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPerson()} style={{ flex: 1 }} />
          <button onClick={addPerson} disabled={adding || !name.trim()}
            style={{ padding: '0 20px', background: '#2563eb', color: '#fff', borderRadius: 8, flexShrink: 0 }}>
            + Нэмэх
          </button>
        </div>

        <input placeholder="Хайх..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: '1rem' }} />

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#999', fontSize: 14 }}>Олдсонгүй</p>
          )}
          {filtered.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none',
              background: p.checked_in ? '#f0fdf4' : '#fff'
            }}>
              <span style={{ fontSize: 13, color: '#aaa', minWidth: 24 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 15, color: '#1a1a1a', fontWeight: p.checked_in ? 500 : 400 }}>{p.name}</span>
              <button onClick={() => toggleCheckin(p.id, p.checked_in)} style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 12,
                background: p.checked_in ? '#dcfce7' : '#f5f5f5',
                color: p.checked_in ? '#16a34a' : '#666',
                border: `1px solid ${p.checked_in ? '#86efac' : '#e5e5e5'}`
              }}>
                {p.checked_in ? '✓ Ирсэн' : 'Ирээгүй'}
              </button>
              <button onClick={() => deletePerson(p.id)}
                style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
