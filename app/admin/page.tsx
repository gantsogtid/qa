'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, getSetting, setSetting, parseCSV, type AttendanceRow, type Question } from '@/lib/supabase'

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
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult]   = useState<string | null>(null)

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

  async function importCSV(file: File) {
    setCsvImporting(true)
    setCsvResult(null)

    let text = await file.text()
    // BOM устгах
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

    const rows = parseCSV(text)
    if (rows.length < 2) {
      setCsvResult('error:Файл хоосон байна')
      setCsvImporting(false)
      return
    }

    // Header мөрөөс баганын байрлал илрүүлэх
    const header = rows[0].map(h => h.toLowerCase().trim())
    const find = (...keys: string[]) => {
      const i = header.findIndex(h => keys.some(k => h.includes(k)))
      return i >= 0 ? i : -1
    }

    const ci = {
      hospital:       find('эмнэлэг', 'байгуулага', 'ажилладаг', 'hospital'),
      last_name:      find('овог', 'lastname', 'last_name'),
      first_name:     find('нэр', 'firstname', 'first_name'),
      position_title: find('тушаал', 'мэргэжил', 'position'),
      email:          find('цахим', 'мэйл', 'email', '@'),
      phone:          find('утас', 'дугаар', 'phone', 'mobile'),
    }

    // Header мөр байгаа эсэхийг шалгах — эхний баганын утга тоо биш бол header
    const hasHeader = isNaN(Number(rows[0][0]?.replace(/\s/g, '')))
    const startIdx = hasHeader ? 1 : 0

    // Positional fallback (header олдоогүй бол)
    const col = (i: number, fallback: number, cols: string[]) =>
      (cols[i >= 0 ? i : fallback] || '').trim()

    const dataRows = rows.slice(startIdx).filter(r => r.length >= 3)
    const records = dataRows.map(cols => {
      const first = col(ci.first_name,  3, cols)
      const last  = col(ci.last_name,   2, cols)
      return {
        hospital:       col(ci.hospital,       1, cols),
        last_name:      last,
        first_name:     first,
        position_title: col(ci.position_title, 4, cols),
        email:          col(ci.email,          5, cols),
        phone:          col(ci.phone,          6, cols),
        name:           `${first} ${last}`.trim(),
        checked_in:     false,
      }
    }).filter(r => r.first_name || r.last_name)

    if (records.length === 0) {
      setCsvResult('error:Мөр олдсонгүй. CSV форматаа шалгана уу.')
      setCsvImporting(false)
      return
    }

    // Дебаг: эхний мөрийн утасны дугаарыг шалгах
    console.log('Эхний мөр:', records[0])
    console.log('Утасны багана индекс:', ci.phone)

    const { error } = await supabase.from('attendance').insert(records)
    if (error) {
      setCsvResult(`error:${error.message}`)
    } else {
      setCsvResult(`ok:${records.length} хүний мэдээлэл амжилттай оруулсан`)
      await fetchList()
    }
    setCsvImporting(false)
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

            {/* Stats */}
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

            {/* CSV Import */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📂 Excel → CSV оруулах</p>
                <button
                  onClick={async () => {
                    if (!confirm(`Нийт ${list.length} бүртгэлийг бүгдийг устгах уу?`)) return
                    const { data: rows } = await supabase.from('attendance').select('id')
                    if (rows && rows.length > 0) {
                      const ids = rows.map((r: any) => r.id)
                      // Batch 100-аар устгах
                      for (let i = 0; i < ids.length; i += 100) {
                        await supabase.from('attendance').delete().in('id', ids.slice(i, i + 100))
                      }
                    }
                    await fetchList()
                    setCsvResult(null)
                  }}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 600 }}
                >
                  🗑️ Бүгдийг арилгаж дахин оруулах
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                Excel файлаа CSV (UTF-8) хэлбэрт хадгалаад upload хийнэ үү.<br/>
                Баганын дараалал: A=дугаар, B=эмнэлэг, C=овог, D=нэр, E=албан тушаал, F=и-мэйл, G=утас
              </p>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '12px', background: csvImporting ? '#f1f5f9' : '#e6f6f6',
                border: `1.5px dashed ${csvImporting ? '#cbd5e1' : '#a8d5d6'}`,
                borderRadius: 10, cursor: csvImporting ? 'default' : 'pointer',
                fontSize: 13, fontWeight: 600, color: P,
              }}>
                {csvImporting ? '⏳ Оруулж байна...' : '📁 CSV файл сонгох'}
                <input type="file" accept=".csv" style={{ display: 'none' }}
                  disabled={csvImporting}
                  onChange={e => { const f = e.target.files?.[0]; if (f) importCSV(f); e.target.value = '' }}
                />
              </label>
              {csvResult && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  background: csvResult.startsWith('ok') ? '#f0fdf4' : '#fef2f2',
                  color: csvResult.startsWith('ok') ? '#16a34a' : '#dc2626',
                  border: `1px solid ${csvResult.startsWith('ok') ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  {csvResult.startsWith('ok') ? '✓ ' : '⚠️ '}{csvResult.split(':')[1]}
                </div>
              )}
            </div>

            {/* Search + add */}
            <input placeholder="🔍 Хайх..." value={search} onChange={e => setSearch(e.target.value)} />

            {/* List */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              {filtered.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 14 }}>Олдсонгүй</p>}
              {filtered.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: p.checked_in ? '#f0fdf4' : '#fff',
                }}>
                  <span style={{ fontSize: 12, color: '#cbd5e1', minWidth: 24, fontWeight: 600 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, color: '#1e293b', fontWeight: p.checked_in ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.name}
                    </p>
                    {p.hospital && <p style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.hospital}{p.position_title ? ` · ${p.position_title}` : ''}</p>}
                    {p.phone && <p style={{ fontSize: 11, color: '#94a3b8' }}>{p.phone}</p>}
                  </div>
                  <button onClick={() => toggleCheckin(p.id, p.checked_in)} style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: p.checked_in ? '#dcfce7' : '#f1f5f9',
                    color: p.checked_in ? '#16a34a' : '#64748b',
                    border: `1px solid ${p.checked_in ? '#86efac' : '#e2e8f0'}`,
                  }}>{p.checked_in ? '✓ Ирсэн' : 'Ирээгүй'}</button>
                  <button onClick={() => deletePerson(p.id)} style={{ flexShrink: 0, padding: '5px 8px', borderRadius: 8, fontSize: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>✕</button>
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
