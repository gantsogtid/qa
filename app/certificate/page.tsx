'use client'
export const dynamic = 'force-dynamic'
import { useState, useRef, useEffect } from 'react'
import { supabase, type AttendanceRow } from '@/lib/supabase'

const P    = '#009194'
const GRAD = 'linear-gradient(135deg, #009194, #007072)'

type EventInfo = {
  id: string
  title: string
  event_date: string
  cert_template_url: string
  cert_name_x: number
  cert_name_y: number
  cert_font_size: number
  cert_font_color: string
}
type Match = AttendanceRow & { eventInfo: EventInfo | null }

function displayName(p: AttendanceRow): string {
  const parts = [p.last_name, p.first_name].filter(Boolean)
  return parts.length ? parts.join(' ') : p.name || ''
}

export default function CertificatePage() {
  const [phone, setPhone]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [matches, setMatches]               = useState<Match[]>([])
  const [selected, setSelected]             = useState<Match | null>(null)
  const [notFound, setNotFound]             = useState(false)
  const [notCheckedIn, setNotCheckedIn]     = useState<Match | null>(null)
  const [certReady, setCertReady]           = useState(false)
  const [canvasDataUrl, setCanvasDataUrl]   = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Ачаалах үед хийх зүйл байхгүй — cert тохиргоо event-д хадгалагдсан
  useEffect(() => {}, [])

  async function search() {
    if (!phone.trim()) return
    setLoading(true)
    setMatches([]); setSelected(null)
    setNotFound(false); setNotCheckedIn(null); setCertReady(false); setCanvasDataUrl('')

    const { data: all } = await supabase
      .from('attendance')
      .select('*')

    setLoading(false)
    if (!all || all.length === 0) { setNotFound(true); return }

    const digits = phone.replace(/\D/g, '')
    const found = all.filter(p => {
      if (!p.phone) return false
      const ph = String(p.phone).replace(/\D/g, '')
      return ph === digits || String(p.phone).trim() === phone.trim()
    })

    if (found.length === 0) { setNotFound(true); return }

    // Бүртгэлтэй ч ирээгүй
    if (found.every(p => !p.checked_in)) {
      setNotCheckedIn({ ...found[0], eventInfo: null } as Match)
      return
    }

    // Зөвхөн ирсэн бүртгэлийг ашиглах
    const checkedIn = found.filter(p => p.checked_in)

    // Event мэдээлэл + cert тохиргоо авах
    const eventIds = Array.from(new Set(checkedIn.map(m => m.event_id).filter(Boolean))) as string[]
    let eventsMap: Record<string, EventInfo> = {}
    if (eventIds.length > 0) {
      const { data: evData } = await supabase
        .from('events')
        .select('id, title, event_date, cert_template_url, cert_name_x, cert_name_y, cert_font_size, cert_font_color')
        .in('id', eventIds)
      eventsMap = Object.fromEntries((evData || []).map(e => [e.id, e]))
    }

    const enriched: Match[] = checkedIn
      .map(m => ({ ...m, eventInfo: m.event_id ? (eventsMap[m.event_id] || null) : null }))
      .filter(m => !!m.eventInfo?.cert_template_url?.trim())  // template-гүй сургалт хасах

    if (enriched.length === 0) {
      // Ирсэн ч нэг ч сургалтад template тохируулаагүй
      setSelected({ ...checkedIn[0], eventInfo: null } as Match)
      return
    }

    setMatches(enriched)
    if (enriched.length === 1) {
      setSelected(enriched[0])
      await drawCertificate(enriched[0])
    }
  }

  async function pickEvent(match: Match) {
    setSelected(match); setCertReady(false); setCanvasDataUrl('')
    await drawCertificate(match)
  }

  async function drawCertificate(person: Match) {
    const canvas = canvasRef.current
    const ev  = person.eventInfo
    const url = ev?.cert_template_url?.trim() || ''
    if (!canvas || !url) { setCertReady(false); return }

    const nameX     = typeof ev?.cert_name_x === 'number' ? ev.cert_name_x : 50
    const nameY     = typeof ev?.cert_name_y === 'number' ? ev.cert_name_y : 50
    const fontSize  = typeof ev?.cert_font_size === 'number' && ev.cert_font_size > 0 ? ev.cert_font_size : 64
    const fontColor = ev?.cert_font_color || '#1e293b'

    await new Promise<void>(resolve => {
      const img = new Image()
      img.onload = () => {
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        ctx.font         = `bold ${fontSize}px Arial, "Helvetica Neue", sans-serif`
        ctx.fillStyle    = fontColor
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(displayName(person), canvas.width * (nameX / 100), canvas.height * (nameY / 100))
        setCanvasDataUrl(canvas.toDataURL('image/png'))
        setCertReady(true)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`
    })
  }

  function download() {
    if (!canvasDataUrl || !selected) return
    const link = document.createElement('a')
    link.download = `${displayName(selected)}-gerchilgee.png`
    link.href = canvasDataUrl
    document.body.appendChild(link); link.click(); link.remove()
  }

  function reset() {
    setPhone(''); setMatches([]); setSelected(null)
    setNotFound(false); setNotCheckedIn(null); setCertReady(false); setCanvasDataUrl('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🎓 Гэрчилгээ авах</h1>
        <p style={{ fontSize: 14, opacity: .8 }}>Бүртгэлийн утасны дугаараа оруулж гэрчилгээгээ татна уу</p>
      </div>

      <div style={{ maxWidth: 480, margin: '-1.5rem auto 0', padding: '0 1rem 6rem' }}>

        {/* Search */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>📱 Утасны дугаар оруулах</p>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="99001122"
            type="tel"
            style={{ marginBottom: 10, fontSize: 20, textAlign: 'center', fontWeight: 700, letterSpacing: 2 }}
            autoFocus
          />
          <button onClick={search} disabled={loading || !phone.trim()}
            style={{
              width: '100%', padding: '13px',
              background: phone.trim() ? GRAD : '#e2e8f0',
              color: phone.trim() ? '#fff' : '#94a3b8',
              borderRadius: 12, fontSize: 15, fontWeight: 700,
            }}>
            {loading ? 'Хайж байна...' : 'Гэрчилгээ авах'}
          </button>
        </div>

        {/* Бүртгэлтэй ч ирцгүй */}
        {notCheckedIn && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>
                {displayName(notCheckedIn)}
              </p>
            </div>
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                Та сургалтад бүртгүүлсэн байна
              </p>
              <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                Гэхдээ гэрчилгээ авахын тулд ирцийн бүртгэлтэй байх шаардлагатай. Ирц бүртгүүлсэн эсэхээ зохион байгуулагчтай нягтлана уу.
              </p>
            </div>
            <button onClick={reset}
              style={{ width: '100%', padding: '12px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700 }}>
              Буцах
            </button>
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🤔</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>"{phone}" дугаар олдсонгүй</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Бүртгүүлэхдээ оруулсан утасны дугаараа шалгаж дахин оруулна уу</p>
            <button onClick={reset} style={{ marginTop: 14, padding: '11px 28px', background: GRAD, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
              Дахин оролдох
            </button>
          </div>
        )}

        {/* Олон сургалт — сонгох */}
        {matches.length > 1 && !certReady && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{displayName(matches[0])}</p>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
              {matches.length} сургалтанд суусан бүртгэл олдлоо. Аль сургалтын гэрчилгээ авах вэ?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matches.map((m, i) => (
                <button key={i} onClick={() => pickEvent(m)}
                  style={{
                    padding: '12px 16px', borderRadius: 12, textAlign: 'left',
                    background: '#f0fdf4', border: '1.5px solid #86efac',
                    fontSize: 14, fontWeight: 600, color: '#1e293b',
                  }}>
                  <div style={{ fontWeight: 700, color: P }}>{m.eventInfo?.title || 'Сургалт'}</div>
                  {m.eventInfo?.event_date && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{m.eventInfo.event_date}</div>}
                  {!m.eventInfo?.cert_template_url && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>⚠ Гэрчилгээний загвар тохируулаагүй</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Загвар тохируулаагүй — гэрчилгээ олгохгүй */}
        {selected && !certReady && !loading && matches.length === 0 && !notFound && !notCheckedIn && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎓</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>{displayName(selected)}</p>
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                Таны сургалтад гэрчилгээ олгохгүй байна
              </p>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                Та сургалтанд бүртгүүлсэн боловч тухайн сургалт гэрчилгээ олгодоггүй байна. Дэлгэрэнгүй мэдээллийг зохион байгуулагчаас лавлана уу.
              </p>
            </div>
            <button onClick={reset} style={{ marginTop: 14, width: '100%', padding: '12px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700 }}>
              Буцах
            </button>
          </div>
        )}

        {/* Certificate ready */}
        {certReady && canvasDataUrl && selected && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 4 }}>🎉</div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{displayName(selected)}</p>
              {selected.eventInfo && (
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {selected.eventInfo.title}{selected.eventInfo.event_date ? ` · ${selected.eventInfo.event_date}` : ''}
                </p>
              )}
              <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>Таны гэрчилгээ бэлэн боллоо</p>
            </div>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 14 }}>
              <img src={canvasDataUrl} alt="certificate" style={{ width: '100%', display: 'block' }} />
            </div>
            <button onClick={download}
              style={{ width: '100%', padding: '15px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 16, fontWeight: 800, boxShadow: '0 4px 20px rgba(0,145,148,.4)', marginBottom: 8 }}>
              ⬇ Гэрчилгээ татах (PNG)
            </button>
            {matches.length > 1 && (
              <button onClick={() => { setSelected(null); setCertReady(false); setCanvasDataUrl('') }}
                style={{ width: '100%', padding: '11px', background: '#f0fdf4', color: P, borderRadius: 12, fontSize: 14, fontWeight: 600, border: `1px solid #a7f3d0`, marginBottom: 8 }}>
                ← Өөр сургалт сонгох
              </button>
            )}
            <button onClick={reset}
              style={{ width: '100%', padding: '11px', background: '#f8fafc', color: '#64748b', borderRadius: 12, fontSize: 14, fontWeight: 600, border: '1px solid #e2e8f0' }}>
              Буцах
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
