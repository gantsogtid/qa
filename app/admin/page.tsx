'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { normalizePhoneDigits, supabase, getActiveEvent, getEvents, getSetting, parseCSV, type AttendanceRow, type EventTopic, type Question, type QuizQuestion, type QuizResult } from '@/lib/supabase'

const P  = '#009194'
const PD = '#007072'
const GRAD = `linear-gradient(135deg, ${P}, ${PD})`

type Tab = 'settings' | 'attendance' | 'questions' | 'quiz'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('settings')
  const [list, setList] = useState<AttendanceRow[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeEvent, setActiveEvent] = useState<EventTopic | null>(null)
  const [events, setEvents] = useState<EventTopic[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
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

  // Quiz state
  const [hasQuiz, setHasQuiz]               = useState(false)
  const [quizBank, setQuizBank]             = useState<QuizQuestion[]>([])
  const [eventQuizQs, setEventQuizQs]       = useState<{ id: string; question_id: string }[]>([])
  const [quizResults, setQuizResults]       = useState<QuizResult[]>([])
  const [newQText, setNewQText]             = useState('')
  const [newQOptions, setNewQOptions]       = useState(['', '', '', ''])
  const [newQCorrect, setNewQCorrect]       = useState(0)
  const [addingQ, setAddingQ]               = useState(false)

  // Certificate settings
  const [certUrl, setCertUrl]               = useState('')
  const [certUrlInput, setCertUrlInput]     = useState('')
  const [certNameX, setCertNameX]           = useState(50)
  const [certNameY, setCertNameY]           = useState(50)
  const [certFontSize, setCertFontSize]     = useState(64)
  const [certFontSizeInput, setCertFontSizeInput] = useState('64')
  const [certFontColor, setCertFontColor]   = useState('#1e293b')
  const [certFontColorInput, setCertFontColorInput] = useState('#1e293b')

  const fetchList = useCallback(async () => {
    if (!selectedEventId) { setList([]); return }
    const { data } = await supabase.from('attendance').select('*').eq('event_id', selectedEventId).order('created_at', { ascending: true })
    setList(data || [])
  }, [selectedEventId])

  const fetchQuestions = useCallback(async () => {
    if (!selectedEventId) { setQuestions([]); return }
    const { data } = await supabase.from('questions').select('*').eq('event_id', selectedEventId).order('likes', { ascending: false })
    setQuestions(data || [])
  }, [selectedEventId])

  function applySelectedEvent(event: EventTopic | null) {
    if (!event) {
      setImageUrl(''); setImageInput('')
      setEventTitle('Арга хэмжээ'); setTitleInput('Арга хэмжээ')
      setEventDate(''); setDateInput('')
      setHasQuiz(false)
      setCertUrl(''); setCertUrlInput('')
      setCertNameX(50); setCertNameY(50)
      setCertFontSize(64); setCertFontSizeInput('64')
      setCertFontColor('#1e293b'); setCertFontColorInput('#1e293b')
      return
    }
    setImageUrl(event.program_image_url || ''); setImageInput(event.program_image_url || '')
    setEventTitle(event.title || 'Арга хэмжээ'); setTitleInput(event.title || 'Арга хэмжээ')
    setEventDate(event.event_date || ''); setDateInput(event.event_date || '')
    setHasQuiz(event.has_quiz ?? false)
    const cu = event.cert_template_url || ''
    setCertUrl(cu); setCertUrlInput(cu)
    const cx = event.cert_name_x ?? 50; setCertNameX(cx)
    const cy = event.cert_name_y ?? 50; setCertNameY(cy)
    const fs = event.cert_font_size ?? 64; setCertFontSize(fs); setCertFontSizeInput(String(fs))
    const fc = event.cert_font_color || '#1e293b'; setCertFontColor(fc); setCertFontColorInput(fc)
  }

  const fetchSettings = useCallback(async () => {
    const event = await getActiveEvent()
    const allEvents = await getEvents()
    setActiveEvent(event)
    setEvents(allEvents)
    const chosen = allEvents.find(e => e.id === selectedEventId) || event || allEvents[0]
    if (!selectedEventId && chosen) setSelectedEventId(chosen.id)
    if (chosen) {
      applySelectedEvent(chosen)
    } else {
      const [img, title, date] = await Promise.all([
        getSetting('program_image_url'),
        getSetting('event_title'),
        getSetting('event_date'),
      ])
      setImageUrl(img); setImageInput(img)
      setEventTitle(title || 'Арга хэмжээ'); setTitleInput(title || 'Арга хэмжээ')
      setEventDate(date); setDateInput(date)
    }

  }, [selectedEventId])

  const fetchQuizData = useCallback(async () => {
    const [bankRes, eqqRes] = await Promise.all([
      supabase.from('quiz_questions').select('*').order('created_at', { ascending: true }),
      selectedEventId
        ? supabase.from('event_quiz_questions').select('id, question_id').eq('event_id', selectedEventId)
        : Promise.resolve({ data: [] }),
    ])
    setQuizBank((bankRes.data as QuizQuestion[]) || [])
    setEventQuizQs((eqqRes.data as { id: string; question_id: string }[]) || [])

    if (selectedEventId) {
      const { data: rr } = await supabase
        .from('quiz_results').select('*')
        .eq('event_id', selectedEventId).order('created_at', { ascending: false })
      setQuizResults((rr as QuizResult[]) || [])
    } else {
      setQuizResults([])
    }
  }, [selectedEventId])

  useEffect(() => {
    if (authed) { fetchList(); fetchQuestions(); fetchSettings() }
  }, [authed, fetchList, fetchQuestions, fetchSettings])

  useEffect(() => {
    if (authed && tab === 'quiz') fetchQuizData()
  }, [authed, tab, fetchQuizData])

  async function saveSetting(key: string, value: string, id: string) {
    const targetEvent = events.find(e => e.id === selectedEventId) || activeEvent
    if (!targetEvent) {
      setSaved(`err-${id}`)
      setTimeout(() => setSaved(null), 3000)
      return
    }

    setSaving(id)
    const column = key === 'event_title' ? 'title' : key === 'event_date' ? 'event_date' : 'program_image_url'
    const res = await supabase.from('events').update({ [column]: value }).eq('id', targetEvent.id)
    const error = res.error?.message ?? null
    if (error) {
      console.error('setSetting:', key, error)
      setSaving(null); setSaved(`err-${id}`); setTimeout(() => setSaved(null), 3000); return
    }
    if (key === 'program_image_url') { setImageUrl(value) }
    if (key === 'event_title') { setEventTitle(value) }
    if (key === 'event_date') { setEventDate(value) }
    const updatedEvent = { ...targetEvent, [column]: value }
    if (targetEvent.is_active) setActiveEvent(updatedEvent)
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
    setSaving(null)
    setSaved(id)
    await fetchSettings()
    setTimeout(() => setSaved(null), 2000)
  }

  async function saveCertSetting(key: string, value: string, id: string) {
    const targetEvent = events.find(e => e.id === selectedEventId) || activeEvent
    if (!targetEvent) { setSaved(`err-${id}`); setTimeout(() => setSaved(null), 2000); return }
    setSaving(id)
    const dbVal = (key === 'cert_name_x' || key === 'cert_name_y') ? parseFloat(value)
      : key === 'cert_font_size' ? parseInt(value)
      : value
    const { error } = await supabase.from('events').update({ [key]: dbVal }).eq('id', targetEvent.id)
    if (error) {
      console.error('saveCertSetting:', key, error.message)
      setSaved(`err-${id}`)
    } else {
      if (key === 'cert_template_url') { setCertUrl(value) }
      if (key === 'cert_name_x') { setCertNameX(parseFloat(value) || 50) }
      if (key === 'cert_name_y') { setCertNameY(parseFloat(value) || 50) }
      if (key === 'cert_font_size') { setCertFontSize(parseInt(value) || 64) }
      if (key === 'cert_font_color') { setCertFontColor(value) }
      const updated = { ...targetEvent, [key]: dbVal } as EventTopic
      if (targetEvent.is_active) setActiveEvent(updated)
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
      setSaved(id)
    }
    setSaving(null)
    setTimeout(() => setSaved(null), 2000)
  }

  async function toggleHasQuiz() {
    const targetEvent = events.find(e => e.id === selectedEventId) || activeEvent
    if (!targetEvent) return
    const next = !hasQuiz
    const { error } = await supabase.from('events').update({ has_quiz: next }).eq('id', targetEvent.id)
    if (!error) {
      setHasQuiz(next)
      const updated = { ...targetEvent, has_quiz: next } as EventTopic
      if (targetEvent.is_active) setActiveEvent(updated)
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
    }
  }

  async function addQuestionToBank() {
    if (!newQText.trim() || newQOptions.some(o => !o.trim())) return
    setAddingQ(true)
    const { data, error } = await supabase.from('quiz_questions').insert({
      question: newQText.trim(),
      options: newQOptions.map(o => o.trim()),
      correct_index: newQCorrect,
    }).select('*').single()
    if (!error && data) {
      setQuizBank(prev => [...prev, data as QuizQuestion])
      setNewQText(''); setNewQOptions(['', '', '', '']); setNewQCorrect(0)
    }
    setAddingQ(false)
  }

  async function deleteFromBank(id: string) {
    if (!confirm('Асуулт устгах уу? Энэ сэдвийн шалгалтаас мөн хасагдана.')) return
    await supabase.from('event_quiz_questions').delete().eq('question_id', id)
    await supabase.from('quiz_questions').delete().eq('id', id)
    setQuizBank(prev => prev.filter(q => q.id !== id))
    setEventQuizQs(prev => prev.filter(e => e.question_id !== id))
  }

  async function addToEventQuiz(questionId: string) {
    if (!selectedEventId) return
    const order_num = eventQuizQs.length
    const { data, error } = await supabase.from('event_quiz_questions')
      .insert({ event_id: selectedEventId, question_id: questionId, order_num })
      .select('id, question_id').single()
    if (!error && data) setEventQuizQs(prev => [...prev, data as { id: string; question_id: string }])
  }

  async function removeFromEventQuiz(eqqId: string) {
    await supabase.from('event_quiz_questions').delete().eq('id', eqqId)
    setEventQuizQs(prev => prev.filter(e => e.id !== eqqId))
  }

  async function createNewEvent() {
    const title = prompt('Шинэ сэдвийн нэр', titleInput || 'Арга хэмжээ')
    if (!title?.trim()) return
    const eventDateValue = prompt('Огноо / цаг', dateInput || '')
    setSaving('new-event')
    const archivedAt = new Date().toISOString()
    const archiveRes = await supabase.from('events').update({ is_active: false, archived_at: archivedAt }).eq('is_active', true)
    if (archiveRes.error) {
      console.error('archiveActiveEvents:', archiveRes.error.message)
      setSaved('err-new-event')
      setSaving(null)
      setTimeout(() => setSaved(null), 2500)
      return
    }

    const { data: created, error } = await supabase.from('events').insert({
      title: title.trim(),
      event_date: eventDateValue?.trim() || '',
      program_image_url: '',
      is_active: true,
    }).select('*').single()
    if (error) {
      console.error('createNewEvent:', error.message)
      setSaved('err-new-event')
    } else {
      setActiveEvent(created)
      setSelectedEventId(created.id)
      setSaved('new-event')
      setTab('settings')
      setCsvResult(null)
      setSearch('')
      await fetchSettings()
      await fetchList()
      await fetchQuestions()
    }
    setSaving(null)
    setTimeout(() => setSaved(null), 2500)
  }

  async function activateSelectedEvent() {
    if (!viewedEvent || viewedEvent.is_active) return
    if (!confirm(`"${viewedEvent.title}" сэдвийг идэвхтэй болгох уу? Одоогийн идэвхтэй сэдэв архивлагдана.`)) return

    setSaving('activate-event')
    const archivedAt = new Date().toISOString()
    const archiveRes = await supabase.from('events').update({ is_active: false, archived_at: archivedAt }).eq('is_active', true)
    if (archiveRes.error) {
      console.error('archiveActiveEvents:', archiveRes.error.message)
      setSaved('err-activate-event')
      setSaving(null)
      setTimeout(() => setSaved(null), 2500)
      return
    }
    const { error } = await supabase.from('events').update({ is_active: true, archived_at: null }).eq('id', viewedEvent.id)
    if (error) {
      console.error('activateSelectedEvent:', error.message)
      setSaved('err-activate-event')
    } else {
      setActiveEvent({ ...viewedEvent, is_active: true, archived_at: null })
      setSelectedEventId(viewedEvent.id)
      setSaved('activate-event')
      await fetchSettings()
      await fetchList()
      await fetchQuestions()
    }
    setSaving(null)
    setTimeout(() => setSaved(null), 2500)
  }

  async function deactivateActiveEvent() {
    if (!activeEvent || viewingArchived) return
    if (!confirm(`"${activeEvent.title}" сэдвийг идэвхгүй болгох уу? Идэвхтэй сэдэвгүй үед web дээр шинэ ирц/асуулт авахгүй.`)) return

    setSaving('deactivate-event')
    const { error } = await supabase
      .from('events')
      .update({ is_active: false, archived_at: new Date().toISOString() })
      .eq('id', activeEvent.id)

    if (error) {
      console.error('deactivateActiveEvent:', error.message)
      setSaved('err-deactivate-event')
    } else {
      setActiveEvent(null)
      setSaved('deactivate-event')
      await fetchSettings()
      await fetchList()
      await fetchQuestions()
    }
    setSaving(null)
    setTimeout(() => setSaved(null), 2500)
  }

  async function toggleCheckin(id: string, current: boolean) {
    if (viewingArchived) return
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
    if (!confirm(`Нийт ${questions.length} асуултыг бүгдийг устгах уу?`)) return
    if (questions.length > 0) {
      const ids = questions.map(q => q.id)
      await supabase.from('question_likes').delete().in('question_id', ids)
      for (let i = 0; i < ids.length; i += 100) {
        await supabase.from('questions').delete().in('id', ids.slice(i, i + 100))
      }
    }
    await fetchQuestions()
  }

  async function importCSV(file: File) {
    setCsvImporting(true)
    setCsvResult(null)
    const targetEvent = events.find(e => e.id === selectedEventId) || activeEvent
    if (!targetEvent || !targetEvent.is_active) {
      setCsvResult('error:Идэвхтэй сэдэв олдсонгүй')
      setCsvImporting(false)
      return
    }

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
    let records = dataRows.map(cols => {
      const first = col(ci.first_name,  3, cols)
      const last  = col(ci.last_name,   2, cols)
      return {
        hospital:       col(ci.hospital,       1, cols),
        last_name:      last,
        first_name:     first,
        position_title: col(ci.position_title, 4, cols),
        email:          col(ci.email,          5, cols),
        phone:          col(ci.phone,          6, cols),
        phone_digits:   normalizePhoneDigits(col(ci.phone, 6, cols)),
        name:           `${first} ${last}`.trim(),
        checked_in:     false,
        event_id:        targetEvent.id,
      }
    }).filter(r => r.first_name || r.last_name)

    if (records.length === 0) {
      setCsvResult('error:Мөр олдсонгүй. CSV форматаа шалгана уу.')
      setCsvImporting(false)
      return
    }

    const seenPhones = new Set<string>()
    let duplicateRows = 0
    records = records.filter(r => {
      if (!r.phone_digits) return true
      if (seenPhones.has(r.phone_digits)) {
        duplicateRows += 1
        return false
      }
      seenPhones.add(r.phone_digits)
      return true
    })

    const phones = records.map(r => r.phone_digits).filter(Boolean)
    if (phones.length > 0) {
      const { data: existing } = await supabase
        .from('attendance')
        .select('phone_digits')
        .eq('event_id', targetEvent.id)
        .in('phone_digits', phones)
      const existingPhones = new Set((existing || []).map(r => r.phone_digits).filter(Boolean))
      records = records.filter(r => {
        if (!r.phone_digits || !existingPhones.has(r.phone_digits)) return true
        duplicateRows += 1
        return false
      })
    }

    if (records.length === 0) {
      setCsvResult(`error:Оруулах шинэ мөр олдсонгүй. ${duplicateRows} давхардсан мөр алгаслаа.`)
      setCsvImporting(false)
      return
    }

    const { error } = await supabase.from('attendance').insert(records)
    if (error) {
      setCsvResult(`error:${error.message}`)
    } else {
      setCsvResult(`ok:${records.length} хүний мэдээлэл амжилттай оруулсан${duplicateRows ? `. ${duplicateRows} давхардсан мөр алгассан` : ''}`)
      await fetchList()
    }
    setCsvImporting(false)
  }

  function downloadAttendanceCSV() {
    const headers = [
      '№',
      'Эмнэлэг/Байгууллага',
      'Овог',
      'Нэр',
      'Овог нэр',
      'Албан тушаал',
      'И-мэйл',
      'Утас',
      'Ирсэн эсэх',
      'Бүртгэсэн огноо',
    ]

    const escapeCSV = (value: unknown) => {
      const s = String(value ?? '')
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }

    const rows = list.map((p, i) => [
      i + 1,
      p.hospital,
      p.last_name,
      p.first_name,
      p.first_name || p.last_name ? `${p.last_name || ''} ${p.first_name || ''}`.trim() : p.name,
      p.position_title,
      p.email,
      p.phone,
      p.checked_in ? 'Ирсэн' : 'Ирээгүй',
      p.created_at ? new Date(p.created_at).toLocaleString('mn-MN') : '',
    ])

    const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `niit-irts-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const filtered = list.filter(p => {
    const q = search.toLowerCase()
    return [p.name, p.first_name, p.last_name, p.phone, p.hospital, p.email, p.position_title]
      .some(v => String(v || '').toLowerCase().includes(q))
  })
  const totalIn  = list.filter(p => p.checked_in).length
  const viewedEvent = events.find(e => e.id === selectedEventId) || activeEvent
  const viewingArchived = !!viewedEvent && !viewedEvent.is_active
  const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PW || '@ssw0rd2o24'

  const SaveBtn = ({ id, onClick }: { id: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={saving === id}
      style={{
        padding: '0 18px', flexShrink: 0, borderRadius: 12, fontSize: 13, fontWeight: 600, height: 44,
        background: saved === `err-${id}` ? '#dc2626' : saved === id ? '#16a34a' : GRAD,
        color: '#fff',
      }}>
      {saved === `err-${id}` ? '⚠ Алдаа' : saved === id ? '✓' : saving === id ? '...' : 'Хадгалах'}
    </button>
  )

  const SaveBtnGlobal = ({ id, onClick }: { id: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={saving === id}
      style={{
        padding: '0 18px', flexShrink: 0, borderRadius: 12, fontSize: 13, fontWeight: 600, height: 44,
        background: saved === `err-${id}` ? '#dc2626' : saved === id ? '#16a34a' : GRAD,
        color: '#fff',
      }}>
      {saved === `err-${id}` ? '⚠ Алдаа' : saved === id ? '✓' : saving === id ? '...' : 'Хадгалах'}
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
          ['settings',   '⚙️ Тохиргоо'],
          ['attendance', `👥 Ирц (${list.length})`],
          ['questions',  `💬 Асуулт (${questions.length})`],
          ['quiz',       '📝 Шалгалт'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '13px 4px', fontSize: 12, fontWeight: 600,
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

            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Идэвхтэй сэдэв</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: P, marginBottom: 4 }}>{activeEvent?.title || 'Сэдэв үүсгээгүй байна'}</p>
              {activeEvent?.event_date && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{activeEvent.event_date}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ border: '1px solid #d4f0f0', background: '#e6f6f6', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: P, marginBottom: 3 }}>WEB ДЭЭР ГАРАХ</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{activeEvent?.title || 'Идэвхтэй сэдэв алга'}</p>
                </div>
                <div style={{ border: `1px solid ${viewingArchived ? '#fecaca' : '#bbf7d0'}`, background: viewingArchived ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: viewingArchived ? '#dc2626' : '#16a34a', marginBottom: 3 }}>ОДОО ҮЗЭЖ БАЙГАА</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{viewedEvent?.title || 'Сонгоогүй'}</p>
                </div>
              </div>
              {events.length > 0 && (
                <select value={selectedEventId} onChange={e => {
                  const eventId = e.target.value
                  const event = events.find(x => x.id === eventId) || null
                  setSelectedEventId(eventId)
                  applySelectedEvent(event)
                  setSearch('')
                }}
                  style={{ width: '100%', marginBottom: 10, padding: '11px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b', background: '#fff' }}>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.is_active ? 'Идэвхтэй' : 'Архив'} - {e.title}{e.event_date ? ` (${e.event_date})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {viewingArchived && (
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                  Архивын сэдэв харж байна. Ирц болон асуулт tab-аас тухайн сэдвийн хүмүүсийг харна.
                </p>
              )}
              {viewingArchived && (
                <button onClick={activateSelectedEvent} disabled={saving === 'activate-event'}
                  style={{ width: '100%', padding: '12px', background: '#16a34a', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  {saving === 'activate-event' ? 'Идэвхжүүлж байна...' : 'Энэ сэдвийг идэвхтэй болгох'}
                </button>
              )}
              {!viewingArchived && activeEvent && (
                <button onClick={deactivateActiveEvent} disabled={saving === 'deactivate-event'}
                  style={{ width: '100%', padding: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 12, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  {saving === 'deactivate-event' ? 'Идэвхгүй болгож байна...' : 'Энэ сэдвийг идэвхгүй болгох'}
                </button>
              )}
              <button onClick={createNewEvent} disabled={saving === 'new-event'}
                style={{ width: '100%', padding: '12px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700 }}>
                {saving === 'new-event' ? 'Үүсгэж байна...' : 'Шинэ сэдэв үүсгэх'}
              </button>
              {events.length > 0 && (
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
                  Архив: {events.filter(e => !e.is_active).length} сэдэв хадгалагдсан
                </p>
              )}
            </div>

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

            {/* Certificate settings */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>🎓 Гэрчилгээний тохиргоо</p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                Оролцогчид <strong>/certificate</strong> хуудас руу ороод утасны дугаараа оруулж гэрчилгээгээ татна
              </p>

              {/* Template URL */}
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>Загварын зураг URL</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input value={certUrlInput} onChange={e => setCertUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveCertSetting('cert_template_url', certUrlInput.trim(), 'cert-url') }}
                  placeholder="https://..." style={{ flex: 1, fontSize: 13 }} />
                <SaveBtnGlobal id="cert-url" onClick={() => saveCertSetting('cert_template_url', certUrlInput.trim(), 'cert-url')} />
              </div>

              {/* Image preview with click-to-position */}
              {certUrl && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 5 }}>
                    Нэр бичигдэх байрлалыг зурган дээр дарж тохируулна уу
                  </p>
                  <div style={{ position: 'relative', cursor: 'crosshair', borderRadius: 8, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}
                    onClick={async (e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = ((e.clientX - rect.left) / rect.width) * 100
                      const y = ((e.clientY - rect.top) / rect.height) * 100
                      setCertNameX(x); setCertNameY(y)
                      const targetEvent = events.find(ev => ev.id === selectedEventId) || activeEvent
                      if (!targetEvent) return
                      setSaving('cert-pos')
                      const { error } = await supabase.from('events')
                        .update({ cert_name_x: x, cert_name_y: y })
                        .eq('id', targetEvent.id)
                      if (!error) {
                        const updated = { ...targetEvent, cert_name_x: x, cert_name_y: y } as EventTopic
                        if (targetEvent.is_active) setActiveEvent(updated)
                        setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))
                      }
                      setSaving(null); setSaved('cert-pos')
                      setTimeout(() => setSaved(null), 1500)
                    }}
                  >
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(certUrl)}`}
                      alt="cert template"
                      style={{ width: '100%', display: 'block' }}
                    />
                    {/* Position marker */}
                    <div style={{
                      position: 'absolute',
                      left: `${certNameX}%`,
                      top: `${certNameY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 16, height: 16,
                      background: '#ef4444',
                      borderRadius: '50%',
                      border: '2.5px solid #fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,.5)',
                      pointerEvents: 'none',
                    }} />
                    {/* Sample name preview */}
                    <div style={{
                      position: 'absolute',
                      left: `${certNameX}%`,
                      top: `${certNameY}%`,
                      transform: 'translate(-50%, calc(-50% - 14px))',
                      fontSize: 10, fontWeight: 700, color: certFontColor,
                      textShadow: '0 1px 3px rgba(0,0,0,.4)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}>Овог Нэр</div>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
                    Байрлал: X={certNameX.toFixed(1)}%, Y={certNameY.toFixed(1)}%
                    {saving === 'cert-pos' && ' · Хадгалж байна...'}
                    {saved === 'cert-pos' && ' · ✓ Хадгалагдлаа'}
                  </p>
                </div>
              )}

              {/* Font size */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', flexShrink: 0, width: 100 }}>Фонтын хэмжээ</p>
                <input value={certFontSizeInput} onChange={e => setCertFontSizeInput(e.target.value)}
                  type="number" min="10" max="300" style={{ flex: 1 }} />
                <SaveBtnGlobal id="cert-font-size" onClick={() => saveCertSetting('cert_font_size', certFontSizeInput, 'cert-font-size')} />
              </div>

              {/* Font color */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', flexShrink: 0, width: 100 }}>Фонтын өнгө</p>
                <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                  <input type="color" value={certFontColorInput} onChange={e => setCertFontColorInput(e.target.value)}
                    style={{ width: 40, height: 38, padding: 2, borderRadius: 6, cursor: 'pointer', border: '1px solid #e2e8f0', flexShrink: 0 }} />
                  <input value={certFontColorInput} onChange={e => setCertFontColorInput(e.target.value)}
                    placeholder="#1e293b" style={{ flex: 1 }} />
                </div>
                <SaveBtnGlobal id="cert-font-color" onClick={() => saveCertSetting('cert_font_color', certFontColorInput, 'cert-font-color')} />
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

            <button onClick={downloadAttendanceCSV} disabled={list.length === 0}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: list.length === 0 ? '#e2e8f0' : GRAD,
                color: list.length === 0 ? '#94a3b8' : '#fff',
                cursor: list.length === 0 ? 'default' : 'pointer',
              }}>
              Нийт ирц CSV татах
            </button>

            {/* CSV Import */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📂 Excel → CSV оруулах</p>
                <button
                  onClick={async () => {
                    if (!confirm(`Нийт ${list.length} бүртгэлийг бүгдийг устгах уу?`)) return
                    if (list.length > 0) {
                      const ids = list.map(r => r.id)
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
                {viewingArchived ? 'Архивласан сургалтанд import хийхгүй' : csvImporting ? '⏳ Оруулж байна...' : '📁 CSV файл сонгох'}
                <input type="file" accept=".csv" style={{ display: 'none' }}
                  disabled={csvImporting || viewingArchived}
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
                  <button onClick={() => toggleCheckin(p.id, p.checked_in)} disabled={viewingArchived} style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: viewingArchived ? '#e2e8f0' : p.checked_in ? '#dcfce7' : '#f1f5f9',
                    color: viewingArchived ? '#94a3b8' : p.checked_in ? '#16a34a' : '#64748b',
                    border: `1px solid ${p.checked_in ? '#86efac' : '#e2e8f0'}`,
                    cursor: viewingArchived ? 'default' : 'pointer',
                  }}>{viewingArchived ? 'Архив' : p.checked_in ? '✓ Ирсэн' : 'Ирээгүй'}</button>
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

        {/* ── Шалгалт ── */}
        {tab === 'quiz' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Toggle */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Шалгалт идэвхтэй эсэх</p>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {hasQuiz ? 'Шалгалт авна — /quiz хуудас идэвхтэй' : 'Шалгалт авахгүй'}
                  </p>
                </div>
                <button onClick={toggleHasQuiz} style={{
                  padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  background: hasQuiz ? '#16a34a' : '#e2e8f0',
                  color: hasQuiz ? '#fff' : '#64748b',
                }}>
                  {hasQuiz ? '✓ Идэвхтэй' : 'Идэвхгүй'}
                </button>
              </div>
            </div>

            {/* Энэ сэдвийн сонгосон асуултууд */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
                Энэ сэдвийн шалгалтын асуулт ({eventQuizQs.length} асуулт)
              </p>
              {eventQuizQs.length === 0 && (
                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>
                  Доорх банкаас асуулт нэмнэ үү
                </p>
              )}
              {eventQuizQs.map((eqq, i) => {
                const q = quizBank.find(x => x.id === eqq.question_id)
                if (!q) return null
                return (
                  <div key={eqq.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < eventQuizQs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 20, paddingTop: 2, flexShrink: 0 }}>{i + 1}</span>
                    <p style={{ flex: 1, fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>{q.question}</p>
                    <button onClick={() => removeFromEventQuiz(eqq.id)}
                      style={{ flexShrink: 0, fontSize: 12, padding: '3px 8px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>✕</button>
                  </div>
                )
              })}
            </div>

            {/* Асуултын банк */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📚 Асуултын банк</p>

              {/* Шинэ асуулт нэмэх */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Шинэ асуулт нэмэх</p>
                <textarea value={newQText} onChange={e => setNewQText(e.target.value)}
                  placeholder="Асуултын текст..." style={{ marginBottom: 10, minHeight: 72, fontSize: 13 }} />
                {newQOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <input type="radio" name="correct" checked={newQCorrect === i} onChange={() => setNewQCorrect(i)}
                      style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                    <input value={opt} onChange={e => { const o = [...newQOptions]; o[i] = e.target.value; setNewQOptions(o) }}
                      placeholder={`${String.fromCharCode(65 + i)} хариулт`} style={{ flex: 1, fontSize: 13 }} />
                  </div>
                ))}
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>● тэмдэглэсэн нь зөв хариулт</p>
                <button onClick={addQuestionToBank}
                  disabled={addingQ || !newQText.trim() || newQOptions.some(o => !o.trim())}
                  style={{
                    padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: !newQText.trim() || newQOptions.some(o => !o.trim()) ? '#e2e8f0' : GRAD,
                    color: !newQText.trim() || newQOptions.some(o => !o.trim()) ? '#94a3b8' : '#fff',
                  }}>
                  {addingQ ? 'Нэмж байна...' : '+ Асуулт нэмэх'}
                </button>
              </div>

              {/* Банкны жагсаалт */}
              {quizBank.length === 0 && (
                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>Асуулт байхгүй байна</p>
              )}
              {quizBank.map((q, i) => {
                const inEvent = eventQuizQs.some(e => e.question_id === q.id)
                const eqq = eventQuizQs.find(e => e.question_id === q.id)
                return (
                  <div key={q.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: i < quizBank.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 20, paddingTop: 2, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#1e293b', marginBottom: 5, lineHeight: 1.4 }}>{q.question}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {q.options.map((o, oi) => (
                          <p key={oi} style={{ fontSize: 11, color: oi === q.correct_index ? '#16a34a' : '#94a3b8' }}>
                            {oi === q.correct_index ? '✓' : '○'} {String.fromCharCode(65 + oi)}. {o}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => inEvent && eqq ? removeFromEventQuiz(eqq.id) : addToEventQuiz(q.id)}
                        style={{
                          fontSize: 11, padding: '5px 10px', borderRadius: 6, fontWeight: 600,
                          background: inEvent ? '#f0fdf4' : '#e6f6f6',
                          color: inEvent ? '#16a34a' : P,
                          border: `1px solid ${inEvent ? '#86efac' : '#a8d5d6'}`,
                        }}>
                        {inEvent ? '✓ Орсон' : '+ Нэмэх'}
                      </button>
                      <button onClick={() => deleteFromBank(q.id)}
                        style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 600 }}>
                        Устгах
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Үр дүн */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
                📊 Шалгалтын үр дүн ({quizResults.length})
              </p>
              {quizResults.length === 0 && (
                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>Үр дүн байхгүй байна</p>
              )}
              {quizResults.map((r, i) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                  borderBottom: i < quizResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: r.passed ? '#f0fdf4' : '#fef2f2',
                    border: `1.5px solid ${r.passed ? '#86efac' : '#fecaca'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: r.passed ? '#16a34a' : '#dc2626', fontWeight: 800,
                  }}>
                    {r.passed ? '✓' : '✕'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name || r.phone}
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>{r.phone} · {r.attempt_num}-р оролдлого</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: r.passed ? '#16a34a' : '#dc2626' }}>
                      {r.score}/{r.total}
                    </p>
                    <p style={{ fontSize: 10, color: '#94a3b8' }}>{Math.round((r.score / r.total) * 100)}%</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
