'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, type Question } from '@/lib/supabase'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
const PROG_COLORS = ['#eab308', '#64748b', '#f97316', '#0ea5e9', '#0ea5e9']

const PROGRAM_IMAGE = process.env.NEXT_PUBLIC_PROGRAM_IMAGE_URL || ''
const EVENT_TITLE   = process.env.NEXT_PUBLIC_EVENT_TITLE || 'Арга хэмжээ'
const EVENT_DATE    = process.env.NEXT_PUBLIC_EVENT_DATE  || ''

export default function DisplayPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [origin, setOrigin] = useState('')

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('likes', { ascending: false })
      .order('created_at', { ascending: true })
    setQuestions(data || [])
  }, [])

  useEffect(() => {
    setOrigin(window.location.origin)
    fetchQuestions()

    const ch = supabase.channel('display-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, fetchQuestions)
      .subscribe()

    // 30 секунд тутамд өгөгдөл дахин татна (realtime-ын fallback)
    const pollTimer = setInterval(fetchQuestions, 30_000)

    // 10 минут тутамд бүтэн хуудсыг reload хийнэ
    const reloadTimer = setInterval(() => window.location.reload(), 10 * 60_000)

    return () => {
      supabase.removeChannel(ch)
      clearInterval(pollTimer)
      clearInterval(reloadTimer)
    }
  }, [fetchQuestions])

  const qrUrl   = `${origin}/questions`
  const topFive = questions.slice(0, 5)
  const maxLikes = topFive[0]?.likes || 1
  const totalLikes = questions.reduce((s, q) => s + q.likes, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)',
        color: '#fff',
        padding: '0 1.5rem',
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{EVENT_TITLE}</h1>
          <p style={{ fontSize: 12, opacity: .75, marginTop: 1 }}>
            Хөтөлбөр харах · QR уншуулж асуулт оруулах · Like дарж TOP 5 сонгох
          </p>
        </div>
        {EVENT_DATE && (
          <div style={{
            fontSize: 13, fontWeight: 700,
            background: 'rgba(255,255,255,.18)',
            borderRadius: 8, padding: '5px 14px',
            whiteSpace: 'nowrap',
          }}>
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
            <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Сургалтын зураг</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            {PROGRAM_IMAGE ? (
              <img
                src={PROGRAM_IMAGE}
                alt="Хөтөлбөр"
                style={{ maxWidth: '100%', maxHeight: 440, objectFit: 'contain', borderRadius: 8 }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#cbd5e1' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🖼️</div>
                <p style={{ fontSize: 13, lineHeight: 1.7 }}>
                  Хөтөлбөрийн зургийг харуулахын тулд<br />
                  <code style={{ color: '#0ea5e9', fontSize: 11 }}>NEXT_PUBLIC_PROGRAM_IMAGE_URL</code><br />
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Vercel env-д тохируулна уу</span>
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
                { n: questions.length, label: 'Нийт асуулт', color: '#0ea5e9' },
                { n: totalLikes, label: 'Нийт санал', color: '#1d4ed8' },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#f8fafc', borderRadius: 12,
                  padding: '12px', textAlign: 'center',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* QR */}
            {origin && (
              <div style={{
                background: 'linear-gradient(135deg, #0ea5e9, #1d4ed8)',
                borderRadius: 20, padding: 18,
                boxShadow: '0 8px 32px rgba(14,165,233,.3)',
              }}>
                <QRCodeSVG value={qrUrl} size={170} bgColor="transparent" fgColor="#fff" level="M" />
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                Асуултаа эндээс оруулна
              </p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Оролцогч QR уншуулж нэр, алба,<br />асуулта бичнэ
              </p>
            </div>

            <div style={{
              background: '#f8fafc', borderRadius: 10,
              padding: '8px 14px', border: '1px solid #e2e8f0', width: '100%',
            }}>
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' }}>
                {qrUrl}
              </p>
            </div>

            {/* Steps */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['1', 'QR уншуулна', 'Утасны нэр тэмдэглэгч аппаар шууд нэвтэрнэ'],
                ['2', 'Асуулт илгээнэ', 'Нэр/алба болон асуулт бөглөөд илгээнэ'],
                ['3', 'Like дарж оноо өгнэ', 'Хамгийн өндөр оноотой 5 асуулт автоматаар ялгарна'],
              ].map(([n, title, desc]) => (
                <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #0ea5e9, #1d4ed8)',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{n}</div>
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
            <span className="badge badge-blue">TOP 5</span>
          </div>

          {/* Top stats */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
            {[
              { n: questions.length, label: 'Нийт асуулт', color: '#0ea5e9' },
              { n: totalLikes, label: 'Нийт санал', color: '#1d4ed8' },
              { n: topFive.length, label: 'Хариулах асуулт', color: '#7c3aed' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: '#f8fafc', borderRadius: 10,
                padding: '8px', textAlign: 'center',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.n}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {questions.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 0', fontSize: 14 }}>
                Одоохондоо асуулт байхгүй байна
              </p>
            )}

            {/* Top 5 */}
            {topFive.length > 0 && (
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: .5, padding: '2px 4px' }}>
                🏆 ХАМГИЙН ИХ LIKE АВСАН 5 АСУУЛТ
              </p>
            )}

            {topFive.map((q, i) => (
              <div key={q.id} style={{
                borderRadius: 12,
                border: `1.5px solid ${i === 0 ? '#fde047' : i === 1 ? '#cbd5e1' : i === 2 ? '#fdba74' : '#e2e8f0'}`,
                background: i === 0 ? '#fefce8' : i === 1 ? '#f8fafc' : i === 2 ? '#fff7ed' : '#fff',
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 24 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8' }}>{i + 1}</span>
                    <span style={{ fontSize: 20 }}>{MEDALS[i]}</span>
                  </div>
                  <p style={{ flex: 1, fontSize: 13, fontWeight: i < 3 ? 600 : 400, lineHeight: 1.55, color: '#1e293b' }}>
                    {q.text}
                  </p>
                  <div style={{
                    flexShrink: 0, textAlign: 'center', minWidth: 52,
                    background: '#fff', borderRadius: 8, padding: '6px 10px',
                    border: `1px solid ${i === 0 ? '#fde047' : i === 1 ? '#cbd5e1' : i === 2 ? '#fdba74' : '#e2e8f0'}`,
                    cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>{q.likes}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>санал өгөх</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 5, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${maxLikes > 0 ? Math.round((q.likes / maxLikes) * 100) : 0}%`,
                    background: `linear-gradient(90deg, ${PROG_COLORS[i]}, ${PROG_COLORS[i]}aa)`,
                    borderRadius: 4,
                    transition: 'width .6s ease',
                  }} />
                </div>
              </div>
            ))}

            {/* Rest */}
            {questions.slice(5).length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: .5, padding: '4px 4px 0' }}>
                  БУСАД АСУУЛТ
                </p>
                {questions.slice(5).map((q, i) => (
                  <div key={q.id} style={{
                    background: '#f8fafc', borderRadius: 10, padding: '10px 12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    border: '1px solid #f1f5f9',
                  }}>
                    <span style={{ fontSize: 11, color: '#cbd5e1', minWidth: 22, fontWeight: 600 }}>#{i + 6}</span>
                    <p style={{ flex: 1, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{q.text}</p>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', flexShrink: 0 }}>{q.likes}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer note */}
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid #f1f5f9',
            background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
            borderRadius: '0 0 16px 16px',
          }}>
            <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
              💡 <strong>Оноо өгөх газар:</strong> Асуулт бүрийн баруун талд байгаа шар өнгийн 👍 <strong>Санал өгөх</strong> товч дэл дарж оноо өгнэ. Дарсан тоо нэмэгдэж, TOP 5 жагсаалт оноогоороо автоматаар эрэмбэлэгдэнэ.
            </p>
          </div>
        </div>
      </div>

      {/* ── View descriptions ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
        padding: '0 1rem 1rem', maxWidth: 1440, margin: '0 auto',
      }} className="display-grid">
        {[
          { icon: '🖥️', title: 'Projector view', desc: 'TOP 5 асуулгыг том дэлгэц дээр шуудхаруулна.' },
          { icon: '📱', title: 'Mobile view', desc: 'QR уншуулсан хэрэглэгч асуулт оруулж, like дарна.' },
          { icon: '⚙️', title: 'Admin view', desc: `Нийт бүртгэл болон асуултын статистик харна.` },
        ].map(v => (
          <div key={v.title} style={{
            background: '#fff', borderRadius: 12, padding: '12px 16px',
            border: '1px solid #e2e8f0',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 20 }}>{v.icon}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9' }}>{v.title}</p>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
