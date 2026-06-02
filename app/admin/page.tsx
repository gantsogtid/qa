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
  const totalIn  = list.filter(p => p.checked_in).length
  const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PW || 'admin123'

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)',
          padding: '1.75rem 1.25rem 3rem', color: '#fff',
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>👥 Ирц бүртгэл</h1>
          <p style={{ fontSize: 14, opacity: .8, marginTop: 4 }}>Зөвхөн зохион байгуулагчдад</p>
        </div>
        <div style={{ maxWidth: 360, margin: '-1.5rem auto 0', padding: '0 1rem', width: '100%' }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,.1)',
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>🔒 Нэвтрэх</p>
            <input
              type="password"
              placeholder="Нууц үг"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pw === ADMIN_PW) setAuthed(true) }}
              style={{ marginBottom: 10 }}
            />
            <button
              onClick={() => pw === ADMIN_PW && setAuthed(true)}
              style={{
                width: '100%', padding: '13px',
                background: 'linear-gradient(135deg, #0ea5e9, #1d4ed8)',
                color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(14,165,233,.35)',
              }}
            >
              Нэвтрэх
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)',
        padding: '1.75rem 1.25rem 3rem', color: '#fff',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>👥 Ирц бүртгэл</h1>
        <p style={{ fontSize: 14, opacity: .8 }}>Бүртгэл удирдах</p>
      </div>

      <div style={{ maxWidth: 600, margin: '-1.5rem auto 0', padding: '0 1rem 1rem' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
          {[
            { label: 'Нийт бүртгэл', value: totalReg, color: '#0ea5e9', icon: '📋' },
            { label: 'Ирсэн хүн', value: totalIn, color: '#16a34a', icon: '✅' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 16, padding: '1rem',
              boxShadow: '0 4px 16px rgba(0,0,0,.07)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add person */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: '1rem',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>+ Хүн нэмэх</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Нэр бичих..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addPerson() }}
              style={{ flex: 1 }}
            />
            <button
              onClick={addPerson}
              disabled={adding || !name.trim()}
              style={{
                padding: '0 20px', flexShrink: 0,
                background: adding || !name.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #0ea5e9, #1d4ed8)',
                color: adding || !name.trim() ? '#94a3b8' : '#fff',
                borderRadius: 12, fontSize: 14, fontWeight: 600,
              }}
            >
              + Нэмэх
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          placeholder="🔍 Хайх..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: '0.75rem' }}
        />

        {/* List */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 14 }}>Олдсонгүй</p>
          )}
          {filtered.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
              background: p.checked_in ? '#f0fdf4' : '#fff',
            }}>
              <span style={{ fontSize: 12, color: '#cbd5e1', minWidth: 24, fontWeight: 600 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 14, color: '#1e293b', fontWeight: p.checked_in ? 600 : 400 }}>
                {p.name}
              </span>
              <button
                onClick={() => toggleCheckin(p.id, p.checked_in)}
                style={{
                  padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: p.checked_in ? '#dcfce7' : '#f1f5f9',
                  color: p.checked_in ? '#16a34a' : '#64748b',
                  border: `1px solid ${p.checked_in ? '#86efac' : '#e2e8f0'}`,
                }}
              >
                {p.checked_in ? '✓ Ирсэн' : 'Ирээгүй'}
              </button>
              <button
                onClick={() => deletePerson(p.id)}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12,
                  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
