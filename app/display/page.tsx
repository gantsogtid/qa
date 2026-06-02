'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, type Question } from '@/lib/supabase'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
const TOP_BG = ['#fef9c3', '#f1f5f9', '#fff7ed', '#f9fafb', '#f9fafb']
const TOP_BORDER = ['#fde047', '#cbd5e1', '#fdba74', '#e5e5e5', '#e5e5e5']

const PROGRAM_IMAGE = process.env.NEXT_PUBLIC_PROGRAM_IMAGE_URL || ''

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
    return () => { supabase.removeChannel(ch) }
  }, [fetchQuestions])

  const qrUrl = `${origin}/questions`
  const topFive = questions.slice(0, 5)
  const rest = questions.slice(5)

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0f172a',
      color: '#fff',
      overflow: 'hidden',
    }}>
      {/* 1-р хэсэг: Хөтөлбөрийн зураг */}
      <section style={{
        flex: '0 0 30%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #1e293b',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: .5, color: '#94a3b8' }}>ХӨТӨЛБӨР</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {PROGRAM_IMAGE ? (
            <img
              src={PROGRAM_IMAGE}
              alt="Хөтөлбөр"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              color: '#334155', userSelect: 'none',
            }}>
              <span style={{ fontSize: 64 }}>🖼️</span>
              <p style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6, maxWidth: 200 }}>
                Хөтөлбөрийн зургийг харуулахын тулд<br />
                <code style={{ color: '#60a5fa', fontSize: 11 }}>NEXT_PUBLIC_PROGRAM_IMAGE_URL</code><br />
                env тохируулна уу
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 2-р хэсэг: QR код */}
      <section style={{
        flex: '0 0 26%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRight: '1px solid #1e293b',
        padding: '2rem 1.5rem',
        gap: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, color: '#94a3b8', marginBottom: 6 }}>
            АСУУЛТ ИЛГЭЭХ
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>
            QR кодыг уншуулж<br />асуулт илгээгээрэй
          </p>
        </div>

        {origin && (
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 20,
            boxShadow: '0 0 60px rgba(37,99,235,.4)',
          }}>
            <QRCodeSVG
              value={qrUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
            />
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>эсвэл хаягаар орно уу</p>
          <p style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600, wordBreak: 'break-all', maxWidth: 220 }}>
            {qrUrl}
          </p>
        </div>

        <div style={{
          background: '#1e293b',
          borderRadius: 12,
          padding: '12px 20px',
          textAlign: 'center',
          border: '1px solid #334155',
        }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc' }}>{questions.length}</p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>нийт асуулт</p>
        </div>
      </section>

      {/* 3-р хэсэг: Асуултын жагсаалт */}
      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⭐</span>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: .5, color: '#94a3b8' }}>
            АСУУЛТУУД — ТОП 5
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.length === 0 && (
            <p style={{ textAlign: 'center', color: '#475569', padding: '3rem 0', fontSize: 14 }}>
              Одоохондоо асуулт байхгүй байна
            </p>
          )}

          {/* Топ 5 */}
          {topFive.map((q, i) => (
            <div key={q.id} style={{
              background: TOP_BG[i],
              border: `2px solid ${TOP_BORDER[i]}`,
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{MEDALS[i]}</span>
              <p style={{
                flex: 1, fontSize: 14, fontWeight: i < 3 ? 600 : 400,
                lineHeight: 1.5, color: '#1a1a1a',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {q.text}
              </p>
              <div style={{
                flexShrink: 0, textAlign: 'center',
                background: '#fff', borderRadius: 8,
                padding: '6px 12px',
                border: `1px solid ${TOP_BORDER[i]}`,
                minWidth: 52,
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>{q.likes}</div>
                <div style={{ fontSize: 10, color: '#999' }}>оноо</div>
              </div>
            </div>
          ))}

          {/* Үлдсэн асуулт */}
          {rest.length > 0 && (
            <>
              <div style={{ padding: '6px 0 2px', borderTop: '1px solid #1e293b', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: .5 }}>
                  БУСАД АСУУЛТ
                </span>
              </div>
              {rest.map((q, i) => (
                <div key={q.id} style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, color: '#475569', minWidth: 20 }}>#{i + 6}</span>
                  <p style={{
                    flex: 1, fontSize: 13, lineHeight: 1.5, color: '#cbd5e1',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {q.text}
                  </p>
                  <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                    {q.likes}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
