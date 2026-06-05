'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, getActiveEvent, type EventTopic, type Question } from '@/lib/supabase'

const P  = '#009194'
const PD = '#007072'
const GRAD = `linear-gradient(135deg, ${P}, ${PD})`
const MAX = 300

function getToken(): string {
  if (typeof window === 'undefined') return ''
  let t = localStorage.getItem('qa_token')
  if (!t) { t = crypto.randomUUID(); localStorage.setItem('qa_token', t) }
  return t
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeEvent, setActiveEvent] = useState<EventTopic | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [likingId, setLikingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchAll = useCallback(async () => {
    const event = await getActiveEvent()
    setActiveEvent(event)
    if (!event) {
      setQuestions([])
      setLikedIds(new Set())
      setLoading(false)
      return
    }

    const token = getToken()
    const [{ data: qs }, { data: ls }] = await Promise.all([
      supabase.from('questions').select('*').eq('event_id', event.id).order('likes', { ascending: false }).order('created_at', { ascending: true }),
      supabase.from('question_likes').select('question_id').eq('user_token', token),
    ])
    setQuestions(qs || [])
    setLikedIds(new Set((ls || []).map((l: any) => l.question_id)))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('q-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  async function submit() {
    if (!activeEvent || !text.trim() || text.length > MAX) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.from('questions').insert({ text: text.trim(), event_id: activeEvent.id })
    if (err) {
      setError(err.message)
    } else {
      setText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSubmitting(false)
  }

  async function toggleLike(id: string) {
    if (likingId) return
    setLikingId(id)
    try {
      const token = getToken()
      const { error } = await supabase.rpc('toggle_like', { p_question_id: id, p_user_token: token })
      if (error) {
        console.error('toggle_like:', error.message)
        setError('Санал өгөхөд алдаа гарлаа: ' + error.message)
      } else {
        await fetchAll()
      }
    } finally {
      setLikingId(null)
    }
  }

  const canSubmit = !!activeEvent && !submitting && text.trim().length > 0 && text.length <= MAX
  const remaining = MAX - text.length

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Асуулт илгээх</h1>
        <p style={{ fontSize: 14, opacity: .8 }}>Асуулт бичиж, бусдын асуултад санал өгнө үү</p>
      </div>

      <div style={{ maxWidth: 600, margin: '-1.5rem auto 0', padding: '0 1rem 1rem' }}>
        {/* Submit card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>✏️  Шинэ асуулт</p>
          <div style={{ position: 'relative' }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Асуултаа энд бичнэ үү..."
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              rows={3}
              maxLength={MAX}
              style={{ marginBottom: 4, borderColor: text.length > MAX * 0.9 ? (text.length >= MAX ? '#dc2626' : '#f59e0b') : undefined }}
            />
            <span style={{
              position: 'absolute', bottom: 10, right: 12,
              fontSize: 11, fontWeight: 500,
              color: text.length >= MAX ? '#dc2626' : text.length > MAX * 0.9 ? '#f59e0b' : '#cbd5e1',
            }}>
              {remaining}
            </span>
          </div>

          {error && (
            <div style={{ marginBottom: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 13, color: '#16a34a' }}>
              ✓ Асуулт амжилттай илгээгдлээ!
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '13px',
              background: canSubmit ? GRAD : '#e2e8f0',
              color: canSubmit ? '#fff' : '#94a3b8',
              borderRadius: 12, fontSize: 15, fontWeight: 700,
              boxShadow: canSubmit ? '0 4px 16px rgba(0,145,148,.35)' : 'none',
            }}
          >
            {submitting ? 'Илгээж байна...' : 'Асуулт илгээх →'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { n: questions.length, label: 'Нийт асуулт', color: P },
            { n: questions.reduce((s, q) => s + q.likes, 0), label: 'Нийт санал', color: PD },
            { n: questions.filter(q => q.likes > 0).length, label: 'Санал авсан', color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.n}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: 14 }}>Ачааллаж байна...</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q, i) => {
            const liked = likedIds.has(q.id)
            const isTop3 = i < 3
            return (
              <div key={q.id} style={{
                background: '#fff', borderRadius: 14,
                border: `1.5px solid ${liked ? '#a8d5d6' : isTop3 ? '#d4f0f0' : '#f1f5f9'}`,
                padding: '13px 13px 13px 15px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                boxShadow: isTop3 ? '0 2px 10px rgba(0,145,148,.07)' : '0 1px 3px rgba(0,0,0,.04)',
              }}>
                <span style={{ fontSize: isTop3 ? 18 : 12, minWidth: 22, paddingTop: isTop3 ? 0 : 3, color: '#cbd5e1', fontWeight: 700 }}>
                  {isTop3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                </span>
                <p style={{ flex: 1, fontSize: 14, lineHeight: 1.65, color: '#1e293b' }}>{q.text}</p>
                <button
                  onClick={() => toggleLike(q.id)}
                  disabled={likingId === q.id}
                  style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '8px 12px', borderRadius: 12,
                    background: liked ? '#e6f6f6' : '#f8fafc',
                    color: liked ? P : '#94a3b8',
                    border: `1.5px solid ${liked ? '#a8d5d6' : '#e2e8f0'}`,
                    minWidth: 52, fontSize: 20,
                    boxShadow: liked ? '0 2px 8px rgba(0,145,148,.15)' : 'none',
                  }}
                >
                  {liked ? '♥' : '♡'}
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{q.likes}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
