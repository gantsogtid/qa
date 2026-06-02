'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, type Question } from '@/lib/supabase'

function getToken(): string {
  if (typeof window === 'undefined') return ''
  let t = localStorage.getItem('qa_token')
  if (!t) { t = crypto.randomUUID(); localStorage.setItem('qa_token', t) }
  return t
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [likingId, setLikingId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const token = getToken()
    const [{ data: qs }, { data: ls }] = await Promise.all([
      supabase.from('questions').select('*').order('likes', { ascending: false }).order('created_at', { ascending: true }),
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
    if (!text.trim()) return
    setSubmitting(true)
    await supabase.from('questions').insert({ text: text.trim() })
    setText('')
    setSubmitting(false)
  }

  async function toggleLike(id: string) {
    if (likingId) return
    setLikingId(id)
    const token = getToken()
    const liked = likedIds.has(id)

    if (liked) {
      await supabase.from('question_likes').delete().eq('question_id', id).eq('user_token', token)
      await supabase.from('questions').update({ likes: (questions.find(q => q.id === id)?.likes || 1) - 1 }).eq('id', id)
    } else {
      await supabase.from('question_likes').insert({ question_id: id, user_token: token })
      await supabase.from('questions').update({ likes: (questions.find(q => q.id === id)?.likes || 0) + 1 }).eq('id', id)
    }
    await fetchAll()
    setLikingId(null)
  }

  return (
    <>
      <nav>
        <span className="brand">Q&amp;A</span>
        <a href="/display">Дэлгэц</a>
        <a href="/questions" className="active">Асуулт</a>
        <a href="/top">Топ 5</a>
        <a href="/admin">Ирц</a>
      </nav>

      <div className="container">
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e5e5e5' }}>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>Асуулт илгээх</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Асуултаа бичнэ үү..."
            onKeyDown={e => e.key === 'Enter' && e.metaKey && submit()}
          />
          <button
            onClick={submit}
            disabled={submitting || !text.trim()}
            style={{
              marginTop: 10, padding: '10px 24px',
              background: submitting || !text.trim() ? '#e5e5e5' : '#2563eb',
              color: submitting || !text.trim() ? '#999' : '#fff',
              borderRadius: 8
            }}
          >
            {submitting ? 'Илгээж байна...' : 'Илгээх'}
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          Нийт {questions.length} асуулт — Like дарж дэмжих
        </p>

        {loading && questions.length === 0 && (
          <p style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '2rem' }}>Ачааллаж байна...</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.map((q, i) => {
            const liked = likedIds.has(q.id)
            return (
              <div key={q.id} style={{
                background: '#fff', borderRadius: 12,
                border: `1px solid ${liked ? '#bfdbfe' : '#e5e5e5'}`,
                padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                transition: 'border-color .2s'
              }}>
                <span style={{ fontSize: 12, color: '#999', minWidth: 20, paddingTop: 2 }}>#{i + 1}</span>
                <p style={{ flex: 1, fontSize: 15, lineHeight: 1.6, color: '#1a1a1a' }}>{q.text}</p>
                <button
                  onClick={() => toggleLike(q.id)}
                  disabled={likingId === q.id}
                  style={{
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '6px 10px', borderRadius: 8,
                    background: liked ? '#eff6ff' : '#f5f5f5',
                    color: liked ? '#2563eb' : '#666',
                    border: `1px solid ${liked ? '#bfdbfe' : '#e5e5e5'}`,
                    fontSize: 18, minWidth: 48
                  }}
                >
                  {liked ? '♥' : '♡'}
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{q.likes}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
