'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, getSetting, setSetting, type AttendanceRow, type Question } from '@/lib/supabase'

const P  = '#009194'
const PD = '#007072'
const GRAD = `linear-gradient(135deg, ${P}, ${PD})`

type Tab = 'settings' | 'attendance' | 'questions'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('settings')
  const [list, setList] = useState<AttendanceRow[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)

  // Settings state
  const [imageUrl, setImageUrl]     = useState('')
  const [imageInput, setImageInput] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [eventDate, setEventDate]   = useState('')
  const [dateInput, setDateInput]   = useState('')
  const [saving, setSaving]         = useState<string | null>(null)
  const [saved, setSaved]           = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    const { data } = await supabase.from('attendance').select('*').order('created_at', { ascending: true })
    setList(data || [])
  }, [])

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase.from('questions').select('*').order('likes', { ascending: false })
    setQuestions(data || [])
  }, [])

  const fetchSettings = useCallback(async () => {
    const [img, title, date] = await Promise.all([
      getSetting('program_image_url'),
      getSetting('event_title'),
      getSetting('event_date'),
    ])
    setImageUrl(img); setImageInput(img)
    setEventTitle(title || 'Арга хэмжээ'); setTitleInput(title || 'Арга хэмжээ')
    setEventDate(date); setDateInput(date)
  }, [])

  useEffect(() => {
    if (authed) { fetchList(); fetchQuestions(); fetchSettings() }
  }, [authed, fetchList, fetchQuestions, fetchSettings])

  async function saveSetting(key: string, value: string, id: string) {
    setSaving(id)
    await setSetting(key, value)
    if (key === 'program_image_url') { setImageUrl(value) }
    if (key === 'event_title') { setEventTitle(value) }
    if (key === 'event_date') { setEventDate(value) }
    setSaving(null)
    setSaved(id)
    setTimeout(() => setSaved(null), 2000)
  }

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

  async function deleteQuestion(id: string) {
    if (!confirm('Асуультыг устгах уу?')) return
    await supabase.from('question_likes').delete().eq('question_id', id)
    await supabase.from('questions').delete().eq('id', id)
    await fetchQuestions()
  }

  async function deleteAllQuestions() {
    if (!confirm('Бүх асуултыг устгах уу? Буцааж сэргээх боломжгүй!')) return
    await supabase.from('question_likes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await fetchQuestions()
  }

  const filtered = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const totalIn  = list.filter(p => p.checked_in).length
  const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PW || 'admin123'

  const SaveBtn = ({ id, onClick }: { id: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={saving === id}
      style={{ padding: '0 18px', flexShrink: 0, background: saved === id ? '#16a34a' : GRAD, color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 600, height: 44 }}>
      {saved === id ? '✓' : saving === id ? '...' : 'Хадгалах'}
    </button>
  )

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
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
            <button onClick={() => pw === ADMIN_PW && setAuthed(true)}
              style={{ width: '100%', padding: '13px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
              Нэвтрэх
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 1rem', color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>⚙️ Удирдлага</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0', paddingTop: 0 }}>
        {([
          ['settings', '⚙️ Тохиргоо'],
          ['attendance', `👥 Ирц (${list.length})`],
          ['questions', `💬 Асуулт (${questions.length})`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '13px 8px', fontSize: 13, fontWeight: 600,
            background: 'none', borderRadius: 0,
            color: tab === t ? P : '#64748b',
            borderBottom: `2px solid ${tab === t ? P : 'transparent'}`,
            transition: 'all .15s',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '1rem' }}>

        {/* ── Тохиргоо ── */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Event title */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📝 Арга хэмжээний нэр</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={titleInput} onChange={e => setTitleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveSetting('event_title', titleInput, 'title') }}
                  placeholder="Арга хэмжээний нэр" style={{ flex: 1 }} />
                <SaveBtn id="title" onClick={() => saveSetting('event_title', titleInput, 'title')} />
              </div>
            </div>

            {/* Event date */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📅 Огноо / Цаг</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={dateInput} onChange={e => setDateInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveSetting('event_date', dateInput, 'date') }}
                  placeholder="2026.06.05 · 08:30 – 13:00" style={{ flex: 1 }} />
                <SaveBtn id="date" onClick={() => saveSetting('event_date', dateInput, 'date')} />
              </div>
            </div>

            {/* Program image */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📋 Хөтөлбөрийн зураг URL</p>
              {imageUrl && (
                <div style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: 180, display: 'flex', justifyContent: 'center', background: '#f8fafc' }}>
                  <img src={imageUrl} alt="preview" style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain' }} />
                </div>
              )}
              <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Google Drive, Dropbox, imgur гэх мэт public link</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={imageInput} onChange={e => setImageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveSetting('program_image_url', imageInput, 'image') }}
                  placeholder="https://..." style={{ flex: 1, fontSize: 13 }} />
                <SaveBtn id="image" onClick={() => saveSetting('program_image_url', imageInput.trim(), 'image')} />
              </div>
            </div>
          </div>
        )}

        {/* ── Ирц ── */}
        {tab === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Нийт бүртгэл', value: list.length, color: P, icon: '📋' },
                { label: 'Ирсэн хүн', value: totalIn, color: '#16a34a', icon: '✅' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{s.icon}</span>
                  <div>
                    <p style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Нэр бичих..." value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addPerson() }}
                  style={{ flex: 1 }}
                />
                <button onClick={addPerson} disabled={adding || !name.trim()}
                  style={{ padding: '0 20px', flexShrink: 0, background: adding || !name.trim() ? '#e2e8f0' : GRAD, color: adding || !name.trim() ? '#94a3b8' : '#fff', borderRadius: 12, fontSize: 14, fontWeight: 600, height: 44 }}>
                  + Нэмэх
                </button>
              </div>
            </div>

            <input placeholder="🔍 Хайх..." value={search} onChange={e => setSearch(e.target.value)} />

            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              {filtered.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 14 }}>Олдсонгүй</p>}
              {filtered.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', background: p.checked_in ? '#f0fdf4' : '#fff' }}>
                  <span style={{ fontSize: 12, color: '#cbd5e1', minWidth: 24, fontWeight: 600 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14, color: '#1e293b', fontWeight: p.checked_in ? 600 : 400 }}>{p.name}</span>
                  <button onClick={() => toggleCheckin(p.id, p.checked_in)} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: p.checked_in ? '#dcfce7' : '#f1f5f9', color: p.checked_in ? '#16a34a' : '#64748b', border: `1px solid ${p.checked_in ? '#86efac' : '#e2e8f0'}` }}>
                    {p.checked_in ? '✓ Ирсэн' : 'Ирээгүй'}
                  </button>
                  <button onClick={() => deletePerson(p.id)} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Асуулт ── */}
        {tab === 'questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={deleteAllQuestions} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  🗑️ Бүгдийг устгах
                </button>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              {questions.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 14 }}>Асуулт байхгүй байна</p>}
              {questions.map((q, i) => (
                <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: i < questions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ flexShrink: 0, background: '#e6f6f6', borderRadius: 8, padding: '4px 10px', textAlign: 'center', minWidth: 44 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: P }}>{q.likes}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>санал</div>
                  </div>
                  <p style={{ flex: 1, fontSize: 13, lineHeight: 1.6, color: '#1e293b', paddingTop: 2 }}>{q.text}</p>
                  <button onClick={() => deleteQuestion(q.id)} style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 8, fontSize: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', marginTop: 2 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
