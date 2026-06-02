'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, getSetting, type Question } from '@/lib/supabase'

const P  = '#009194'
const PD = '#007072'
const GRAD = `linear-gradient(135deg, ${P}, ${PD})`
const MEDALS      = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
const PROG_COLORS = ['#eab308', '#64748b', '#f97316', P, P]

const EVENT_TITLE = process.env.NEXT_PUBLIC_EVENT_TITLE || 'Арга хэмжээ'
const EVENT_DATE  = process.env.NEXT_PUBLIC_EVENT_DATE  || ''

function getToken(): string {
  if (typeof window === 'undefined') return ''
  let t = localStorage.getItem('qa_token')
  if (!t) { t = crypto.randomUUID(); localStorage.setItem('qa_token', t) }
  return t
}

export default function DisplayPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [likingId, setLikingId] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  const [programImage, setProgramImage] = useState(process.env.NEXT_PUBLIC_PROGRAM_IMAGE_URL || '')

  const fetchQuestions = useCallback(async () => {
    const token = getToken()
    const [{ data: qs }, { data: ls }] = await Promise.all([
      supabase.from('questions').select('*').order('likes', { ascending: false }).order('created_at', { ascending: true }),
      supabase.from('question_likes').select('question_id').eq('user_token', token),
    ])
    setQuestions(qs || [])
    setLikedIds(new Set((ls || []).map((l: any) => l.question_id)))
  }, [])

  async function toggleLike(id: string) {
    if (likingId) return
    setLikingId(id)
    const token = getToken()
    const liked = likedIds.has(id)
    const q = questions.find(q => q.id === id)
    if (liked) {
      await supabase.from('question_likes').delete().eq('question_id', id).eq('user_token', token)
      await supabase.from('questions').update({ likes: Math.max(0, (q?.likes || 1) - 1) }).eq('id', id)
    } else {
      await supabase.from('question_likes').insert({ question_id: id, user_token: token })
      await supabase.from('questions').update({ likes: (q?.likes || 0) + 1 }).eq('id', id)
    }
    await fetchQuestions()
    setLikingId(null)
  }

  useEffect(() => {
    setOrigin(window.location.origin)
    fetchQuestions()
    getSetting('program_image_url').then(url => { if (url) setProgramImage(url) })

    const ch = supabase.channel('display-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, fetchQuestions)
      .subscribe()

    const pollTimer   = setInterval(fetchQuestions, 30_000)
    const reloadTimer = setInterval(() => window.location.reload(), 10 * 60_000)

    return () => {
      supabase.removeChannel(ch)
      clearInterval(pollTimer)
      clearInterval(reloadTimer)
    }
  }, [fetchQuestions])

  const qrUrl    = `${origin}/questions`
  const topFive  = questions.slice(0, 5)
  const maxLikes = topFive[0]?.likes || 1
  const totalLikes = questions.reduce((s, q) => s + q.likes, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>

      {/* ── Header ── */}
      <header style={{
        background: GRAD, color: '#fff',
        padding: '0 1.5rem', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{EVENT_TITLE}</h1>
          <p style={{ fontSize: 12, opacity: .75, marginTop: 1 }}>
            Хөтөлбөр харах · QR уншуулж асуулт оруулах · Like дарж TOP 5 сонгох
          </p>
        </div>
        {EVENT_DATE && (
          <div style={{ fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,.18)', borderRadius: 8, padding: '5px 14px', whiteSpace: 'nowrap' }}>
            {EVENT_DATE}
          </div>
        )}
      </header>

      {/* ── 3 columns ── */}
      <div className="display-grid" style={{ padding: '1rem', maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Col 1: Хөтөлбөр ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          <div className="card-header">
            <span>📋</span>
            <span className="card-title">1. Хөтөлбөр</span>
            <span className="badge badge-teal">Сургалтын зураг</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            {programImage ? (
              <img
                src={programImage}
                alt="Хөтөлбөр"
                style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain', borderRadius: 8 }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#cbd5e1' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🖼️</div>
                <p style={{ fontSize: 13, lineHeight: 1.7 }}>
                  Admin хуудаснаас<br />
                  хөтөлбөрийн зургийн URL<br />
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>оруулна уу</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Col 2: QR код ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <span>📱</span>
            <span className="card-title">2. QR уншуулж асуулт оруулах</span>
            <span className="badge badge-green">Mobile friendly</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', gap: 20 }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
              {[
                { n: questions.length, label: 'Нийт асуулт', color: P },
                { n: totalLikes, label: 'Нийт санал', color: PD },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', borderRadius: 12, padding: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* QR */}
            {origin && (
              <div style={{ background: GRAD, borderRadius: 20, padding: 18, boxShadow: '0 8px 32px rgba(0,145,148,.3)' }}>
                <QRCodeSVG value={qrUrl} size={170} bgColor="transparent" fgColor="#fff" level="M" />
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Асуултаа эндээс оруулна</p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Оролцогч QR уншуулж нэр, алба,<br />асуулта бичнэ
              </p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 14px', border: '1px solid #e2e8f0', width: '100%' }}>
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' }}>{qrUrl}</p>
            </div>

            {/* Steps */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['1', 'QR уншуулна', 'Утасны нэр тэмдэглэгч аппаар шууд нэвтэрнэ'],
                ['2', 'Асуулт илгээнэ', 'Нэр/алба болон асуулт бөглөөд илгээнэ'],
                ['3', 'Like дарж оноо өгнэ', 'Хамгийн өндөр оноотой 5 асуулт автоматаар ялгарна'],
              ].map(([n, title, desc]) => (
                <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: GRAD, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{title}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Col 3: Top 5 ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <span>⭐</span>
            <span className="card-title">3. Live voting · Оноо өгөх хэсэг</span>
            <span className="badge badge-teal">TOP 5</span>
          </div>

          {/* Top stats */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
            {[
              { n: questions.length, label: 'Нийт асуулт', color: P },
              { n: totalLikes, label: 'Нийт санал', color: PD },
              { n: topFive.length, label: 'Хариулах асуулт', color: '#7c3aed' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.n}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {questions.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 0', fontSize: 14 }}>Одоохондоо асуулт байхгүй байна</p>
            )}

            {topFive.length > 0 && (
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: .5, padding: '2px 4px' }}>
                🏆 ХАМГИЙН ИХ LIKE АВСАН 5 АСУУЛТ
              </p>
            )}

            {topFive.map((q, i) => (
              <div key={q.id} style={{
                borderRadius: 12,
                border: `1.5px solid ${i===0?'#fde047':i===1?'#cbd5e1':i===2?'#fdba74':'#e2e8f0'}`,
                background: i===0?'#fefce8':i===1?'#f8fafc':i===2?'#fff7ed':'#fff',
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 24 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8' }}>{i+1}</span>
                    <span style={{ fontSize: 20 }}>{MEDALS[i]}</span>
                  </div>
                  <p style={{ flex: 1, fontSize: 13, fontWeight: i<3?600:400, lineHeight: 1.55, color: '#1e293b' }}>{q.text}</p>
                  <button
                    onClick={() => toggleLike(q.id)}
                    disabled={likingId === q.id}
                    style={{
                      flexShrink: 0, textAlign: 'center', minWidth: 60,
                      background: likedIds.has(q.id) ? '#e6f6f6' : '#fff',
                      borderRadius: 10, padding: '8px 12px',
                      border: `1.5px solid ${likedIds.has(q.id) ? '#a8d5d6' : i===0?'#fde047':i===1?'#cbd5e1':i===2?'#fdba74':'#e2e8f0'}`,
                      cursor: likingId === q.id ? 'wait' : 'pointer',
                      boxShadow: likedIds.has(q.id) ? '0 2px 8px rgba(0,145,148,.2)' : 'none',
                      transition: 'all .15s',
                    }}
                  >
                    <div style={{ fontSize: 20 }}>{likedIds.has(q.id) ? '♥' : '♡'}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: likedIds.has(q.id) ? P : '#64748b' }}>{q.likes}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>санал өгөх</div>
                  </button>
                </div>
                <div style={{ height: 5, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${maxLikes>0?Math.round((q.likes/maxLikes)*100):0}%`, background: PROG_COLORS[i], borderRadius: 4, transition: 'width .6s ease' }} />
                </div>
              </div>
            ))}

            {questions.slice(5).length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: .5, padding: '4px 4px 0' }}>БУСАД АСУУЛТ</p>
                {questions.slice(5).map((q, i) => (
                  <div key={q.id} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, color: '#cbd5e1', minWidth: 22, fontWeight: 600 }}>#{i+6}</span>
                    <p style={{ flex: 1, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{q.text}</p>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', flexShrink: 0 }}>{q.likes}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer note */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
            <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
              💡 <strong>Оноо өгөх газар:</strong> Асуулт бүрийн баруун талд байгаа <strong>санал өгөх</strong> товч дарж оноо өгнэ. TOP 5 жагсаалт автоматаар эрэмбэлэгдэнэ.
            </p>
          </div>
        </div>
      </div>

      {/* ── View descriptions ── */}
      <div className="display-grid" style={{ padding: '0 1rem 1rem', maxWidth: 1440, margin: '0 auto' }}>
        {[
          { icon: '🖥️', title: 'Projector view', desc: 'TOP 5 асуулгыг том дэлгэц дээр шуудхаруулна.' },
          { icon: '📱', title: 'Mobile view', desc: 'QR уншуулсан хэрэглэгч асуулт оруулж, like дарна.' },
          { icon: '⚙️', title: 'Admin view', desc: 'Хөтөлбөрийн зураг тохируулах, ирц бүртгэл удирдах.' },
        ].map(v => (
          <div key={v.title} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>{v.icon}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: P }}>{v.title}</p>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
