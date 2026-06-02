'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, getSetting, setSetting, type AttendanceRow } from '@/lib/supabase'

const P  = '#009194'
const PD = '#007072'
const GRAD = `linear-gradient(135deg, ${P}, ${PD})`

export default function AdminPage() {
  const [list, setList] = useState<AttendanceRow[]>([])
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageInput, setImageInput] = useState('')
  const [savingImage, setSavingImage] = useState(false)
  const [imageSaved, setImageSaved] = useState(false)

  const fetchList = useCallback(async () => {
    const { data } = await supabase.from('attendance').select('*').order('created_at', { ascending: true })
    setList(data || [])
  }, [])

  const fetchImage = useCallback(async () => {
    const url = await getSetting('program_image_url')
    setImageUrl(url)
    setImageInput(url)
  }, [])

  useEffect(() => {
    if (authed) { fetchList(); fetchImage() }
  }, [authed, fetchList, fetchImage])

  async function addPerson() {
    if (!name.trim()) return
    setAdding(true)
    await supabase.from('attendance').insert({ name: name.trim() })
    setName('')
    await fetchList()
    setAdding(false)
  }

  async function toggleCheckin(id: string, current: boolean) {
    await supabase.from('attendance').update({ checked_in: !current }).eq('id', id)
    await fetchList()
  }

  async function deletePerson(id: string) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('attendance').delete().eq('id', id)
    await fetchList()
  }

  async function saveImage() {
    setSavingImage(true)
    await setSetting('program_image_url', imageInput.trim())
    setImageUrl(imageInput.trim())
    setSavingImage(false)
    setImageSaved(true)
    setTimeout(() => setImageSaved(false), 2000)
  }

  const filtered = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const totalReg = list.length
  const totalIn  = list.filter(p => p.checked_in).length
  const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PW || 'admin123'

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f4', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>⚙️ Удирдлага</h1>
          <p style={{ fontSize: 14, opacity: .8, marginTop: 4 }}>Зөвхөн зохион байгуулагчдад</p>
        </div>
        <div style={{ maxWidth: 360, margin: '-1.5rem auto 0', padding: '0 1rem', width: '100%' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>🔒 Нэвтрэх</p>
            <input type="password" placeholder="Нууц үг" value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pw === ADMIN_PW) setAuthed(true) }}
              style={{ marginBottom: 10 }}
            />
            <button
              onClick={() => pw === ADMIN_PW && setAuthed(true)}
              style={{ width: '100%', padding: '13px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,145,148,.35)' }}
            >
              Нэвтрэх
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>⚙️ Удирдлага</h1>
        <p style={{ fontSize: 14, opacity: .8 }}>Хөтөлбөрийн зураг · Ирц бүртгэл</p>
      </div>

      <div style={{ maxWidth: 600, margin: '-1.5rem auto 0', padding: '0 1rem 1rem' }}>

        {/* ── Хөтөлбөрийн зураг ── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,.07)', marginBottom: '1rem' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>📋 Хөтөлбөрийн зураг</p>

          {imageUrl && (
            <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: 200, display: 'flex', justifyContent: 'center', background: '#f8fafc' }}>
              <img src={imageUrl} alt="Хөтөлбөр" style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          )}

          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
            Зургийн URL (Google Drive, Dropbox, imgur гэх мэт public link)
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="https://..."
              value={imageInput}
              onChange={e => setImageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveImage() }}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              onClick={saveImage}
              disabled={savingImage}
              style={{
                padding: '0 18px', flexShrink: 0,
                background: imageSaved ? '#16a34a' : GRAD,
                color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 600,
              }}
            >
              {imageSaved ? '✓ Хадгалсан' : savingImage ? '...' : 'Хадгалах'}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
          {[
            { label: 'Нийт бүртгэл', value: totalReg, color: P, icon: '📋' },
            { label: 'Ирсэн хүн',    value: totalIn,  color: '#16a34a', icon: '✅' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '1rem', boxShadow: '0 4px 16px rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Add person ── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>+ Хүн нэмэх</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Нэр бичих..." value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addPerson() }}
              style={{ flex: 1 }}
            />
            <button
              onClick={addPerson} disabled={adding || !name.trim()}
              style={{ padding: '0 20px', flexShrink: 0, background: adding || !name.trim() ? '#e2e8f0' : GRAD, color: adding || !name.trim() ? '#94a3b8' : '#fff', borderRadius: 12, fontSize: 14, fontWeight: 600 }}
            >
              + Нэмэх
            </button>
          </div>
        </div>

        {/* ── Search + list ── */}
        <input placeholder="🔍 Хайх..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ marginBottom: '0.75rem' }} />

        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          {filtered.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 14 }}>Олдсонгүй</p>}
          {filtered.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
              background: p.checked_in ? '#f0fdf4' : '#fff',
            }}>
              <span style={{ fontSize: 12, color: '#cbd5e1', minWidth: 24, fontWeight: 600 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 14, color: '#1e293b', fontWeight: p.checked_in ? 600 : 400 }}>{p.name}</span>
              <button onClick={() => toggleCheckin(p.id, p.checked_in)} style={{
                padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: p.checked_in ? '#dcfce7' : '#f1f5f9',
                color: p.checked_in ? '#16a34a' : '#64748b',
                border: `1px solid ${p.checked_in ? '#86efac' : '#e2e8f0'}`,
              }}>
                {p.checked_in ? '✓ Ирсэн' : 'Ирээгүй'}
              </button>
              <button onClick={() => deletePerson(p.id)} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
