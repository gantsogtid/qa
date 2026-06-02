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

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 3 * 60 * 1000
}

function downloadImage(url: string) {
  const a = document.createElement('a')
  a.href = `/api/download?url=${encodeURIComponent(url)}`
  a.download = 'hotolbor.jpg'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export default function DisplayPage() {
  const [questions, setQuestions]     = useState<Question[]>([])
  const [origin, setOrigin]           = useState('')
  const [programImage, setProgramImage] = useState(process.env.NEXT_PUBLIC_PROGRAM_IMAGE_URL || '')
  const [eventTitle, setEventTitle]   = useState(process.env.NEXT_PUBLIC_EVENT_TITLE || 'Арга хэмжээ')
  const [eventDate,  setEventDate]    = useState(process.env.NEXT_PUBLIC_EVENT_DATE  || '')

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase
      .from('questions').select('*')
      .order('likes', { ascending: false })
      .order('created_at', { ascending: true })
    setQuestions(data || [])
  }, [])

  useEffect(() => {
    setOrigin(window.location.origin)
    fetchQuestions()
    Promise.all([
      getSetting('program_image_url'),
      getSetting('event_title'),
      getSetting('event_date'),
    ]).then(([img, title, date]) => {
      if (img)   setProgramImage(img)
      if (title) setEventTitle(title)
      if (date)  setEventDate(date)
    })
    const ch = supabase.channel('display-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, fetchQuestions)
      .subscribe()
    const pollTimer   = setInterval(fetchQuestions, 30_000)
    const reloadTimer = setInterval(() => window.location.reload(), 10 * 60_000)
    return () => { supabase.removeChannel(ch); clearInterval(pollTimer); clearInterval(reloadTimer) }
  }, [fetchQuestions])

  const qrUrl      = `${origin}/questions`
  const topFive    = questions.slice(0, 5)
  const maxLikes   = topFive[0]?.likes || 1
  const totalLikes = questions.reduce((s, q) => s + q.likes, 0)
  const recentQs   = [...questions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Card shared style
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,.06)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden', height: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f4f4' }}>

      {/* ── Header ── */}
      <header style={{
        background: GRAD, color: '#fff',
        padding: '0 1.5rem', height: 60, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{eventTitle}</h1>
          <p style={{ fontSize: 12, opacity: .75, marginTop: 1 }}>
            Хөтөлбөр харах · QR уншуулж асуулт оруулах · Like дарж TOP 5 сонгох
          </p>
        </div>
        {eventDate && (
          <div style={{ fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,.18)', borderRadius: 8, padding: '5px 14px', whiteSpace: 'nowrap' }}>
            {eventDate}
          </div>
        )}
      </header>

      {/* ── Grid (fills remaining viewport) ── */}
      <div className="display-outer" style={{ flex: 1, padding: '1rem', minHeight: 0 }}>
        <div className="display-grid">

          {/* ── Col 1: Хөтөлбөр ── */}
          <div style={card}>
            <div className="card-header">
              <span>📋</span>
              <span className="card-title">1. Хөтөлбөр</span>
              {programImage && (
                <button onClick={() => downloadImage(programImage)}
                  style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 8, background: '#e6f6f6', color: P, border: `1px solid #a8d5d6`, fontSize: 12, fontWeight: 600 }}>
                  ⬇️ Татах
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {programImage ? (
                <img src={programImage} alt="Хөтөлбөр"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#fff' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
                  <p style={{ fontSize: 13, lineHeight: 1.7 }}>
                    Admin → Тохиргооноос<br />зургийн URL оруулна уу
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Col 2: QR + Top 5 ── */}
          <div style={card}>
            <div className="card-header">
              <span>📱</span>
              <span className="card-title">2. QR уншуулж асуулт оруулах</span>
              <span className="badge badge-green">Mobile</span>
            </div>

            {/* Fixed top: stats + QR + text */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 16px', gap: 10, flexShrink: 0 }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%' }}>
                {[
                  { n: questions.length, label: 'Нийт асуулт', color: P },
                  { n: totalLikes,       label: 'Нийт санал',  color: PD },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* QR */}
              {origin && (
                <div style={{ background: GRAD, borderRadius: 16, padding: 12, boxShadow: '0 6px 24px rgba(0,145,148,.3)' }}>
                  <QRCodeSVG value={qrUrl} size={130} bgColor="transparent" fgColor="#fff" level="M" />
                </div>
              )}

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>Асуултаа эндээс оруулна</p>
                <p style={{ fontSize: 11, color: '#64748b' }}>QR уншуулж асуулт бичнэ</p>
              </div>
              <a href={qrUrl} target="_blank" rel="noopener noreferrer"
                style={{ background: '#f8fafc', borderRadius: 8, padding: '5px 10px', border: `1px solid #a8d5d6`, width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                <p style={{ fontSize: 10, color: P, fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 600 }}>{qrUrl} ↗</p>
              </a>
            </div>

            {/* Scrollable: Top 5 compact */}
            <div style={{ borderTop: '1px solid #f1f5f9', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: .5, padding: '8px 14px 4px' }}>
                🏆 ТОП 5 АСУУЛТ
              </p>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
                {topFive.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem', fontSize: 12 }}>Асуулт байхгүй</p>
                )}
                {topFive.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 6px', borderBottom: i < topFive.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{MEDALS[i]}</span>
                    <p style={{ flex: 1, fontSize: 12, lineHeight: 1.4, color: '#1e293b', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{q.text}</p>
                    <div style={{ flexShrink: 0, textAlign: 'center', background: '#e6f6f6', borderRadius: 6, padding: '3px 8px', minWidth: 36 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: P }}>{q.likes}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Col 3: Live voting + Шинэ бүртгэл ── */}
          <div style={card}>
            <div className="card-header">
              <span>⭐</span>
              <span className="card-title">3. Live voting · Оноо өгөх хэсэг</span>
              <span className="badge badge-teal">TOP 5</span>
            </div>

            {/* Stats */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 6, flexShrink: 0 }}>
              {[
                { n: questions.length, label: 'Нийт асуулт', color: P },
                { n: totalLikes, label: 'Нийт санал', color: PD },
                { n: topFive.length, label: 'Хариулах', color: '#7c3aed' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.n}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Top 5 section (60%) + Шинэ бүртгэл (40%) */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

              {/* Top 5 */}
              <div style={{ flex: 6, overflowY: 'auto', padding: '6px 10px', borderBottom: '2px solid #f1f5f9' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: .5, marginBottom: 6, paddingLeft: 2 }}>
                  🏆 ХАМГИЙН ИХ LIKE АВСАН 5 АСУУЛТ
                </p>
                {topFive.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem', fontSize: 12 }}>Одоохондоо асуулт байхгүй</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topFive.map((q, i) => (
                    <div key={q.id} style={{
                      borderRadius: 10, padding: '9px 12px',
                      border: `1.5px solid ${i===0?'#fde047':i===1?'#cbd5e1':i===2?'#fdba74':'#e2e8f0'}`,
                      background: i===0?'#fefce8':i===1?'#f8fafc':i===2?'#fff7ed':'#fff',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{MEDALS[i]}</span>
                        <p style={{ flex: 1, fontSize: 12, fontWeight: i<3?600:400, lineHeight: 1.5, color: '#1e293b' }}>{q.text}</p>
                        <div style={{ flexShrink: 0, textAlign: 'center', background: '#fff', borderRadius: 7, padding: '4px 8px', border: `1px solid ${i===0?'#fde047':i===1?'#cbd5e1':i===2?'#fdba74':'#e2e8f0'}`, minWidth: 44 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: P }}>{q.likes}</div>
                          <div style={{ fontSize: 9, color: '#94a3b8' }}>санал</div>
                        </div>
                      </div>
                      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${maxLikes>0?Math.round((q.likes/maxLikes)*100):0}%`, background: PROG_COLORS[i], borderRadius: 4, transition: 'width .6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Шинэ бүртгэл live feed */}
              <div style={{ flex: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: .5, padding: '6px 12px 4px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 2px rgba(34,197,94,.3)' }} />
                  ШИНЭ БҮРТГЭЛ
                </p>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {recentQs.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem', fontSize: 11 }}>Асуулт байхгүй</p>
                  )}
                  {recentQs.map(q => (
                    <div key={q.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '7px 10px', borderRadius: 8,
                      background: isNew(q.created_at) ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${isNew(q.created_at) ? '#bbf7d0' : '#f1f5f9'}`,
                    }}>
                      {isNew(q.created_at) && (
                        <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, background: '#22c55e', color: '#fff', borderRadius: 4, padding: '1px 5px', marginTop: 2 }}>
                          NEW
                        </span>
                      )}
                      <p style={{ flex: 1, fontSize: 11, lineHeight: 1.5, color: '#1e293b', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{q.text}</p>
                      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{q.likes > 0 ? `♥ ${q.likes}` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: '#64748b' }}>
                💡 QR уншуулж гар утасны <strong>/questions</strong> хуудаснаас санал өгнө үү
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
