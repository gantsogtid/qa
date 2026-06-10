'use client'
export const dynamic = 'force-dynamic'
import { useState, useRef, useEffect } from 'react'
import { supabase, getLatestEvent, getSetting, type AttendanceRow, type EventTopic } from '@/lib/supabase'

const P    = '#009194'
const GRAD = 'linear-gradient(135deg, #009194, #007072)'

function displayName(p: AttendanceRow): string {
  const parts = [p.last_name, p.first_name].filter(Boolean)
  return parts.length ? parts.join(' ') : p.name || ''
}

export default function CertificatePage() {
  const [phone, setPhone]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [found, setFound]             = useState<AttendanceRow | null>(null)
  const [notFound, setNotFound]       = useState(false)
  const [notCheckedIn, setNotCheckedIn] = useState(false)
  const [certReady, setCertReady]     = useState(false)
  const [canvasDataUrl, setCanvasDataUrl] = useState('')
  const [event, setEvent]             = useState<EventTopic | null>(null)
  const [eventLoading, setEventLoading] = useState(true)

  // Cert settings (loaded once on mount)
  const certTemplateUrl = useRef('')
  const certNameX       = useRef(50)
  const certNameY       = useRef(50)
  const certFontSize    = useRef(64)
  const certFontColor   = useRef('#1e293b')

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    async function load() {
      const [event, url, x, y, fs, fc] = await Promise.all([
        getLatestEvent(),
        getSetting('cert_template_url'),
        getSetting('cert_name_x'),
        getSetting('cert_name_y'),
        getSetting('cert_font_size'),
        getSetting('cert_font_color'),
      ])
      setEvent(event)
      certTemplateUrl.current = url
      certNameX.current       = parseFloat(x) || 50
      certNameY.current       = parseFloat(y) || 50
      certFontSize.current    = parseInt(fs)  || 64
      certFontColor.current   = fc || '#1e293b'
      setEventLoading(false)
    }
    load()
  }, [])

  async function search() {
    if (!phone.trim() || !event) return
    setLoading(true)
    setFound(null)
    setNotFound(false)
    setNotCheckedIn(false)
    setCertReady(false)
    setCanvasDataUrl('')

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('event_id', event.id)

    setLoading(false)

    if (!data || data.length === 0) { setNotFound(true); return }

    const digits = phone.replace(/\D/g, '')
    const match = data.find(p => {
      if (!p.phone) return false
      const ph = String(p.phone).replace(/\D/g, '')
      return ph === digits || String(p.phone).trim() === phone.trim()
    })

    if (!match) { setNotFound(true); return }

    setFound(match)
    if (!match.checked_in) { setNotCheckedIn(true); return }

    await drawCertificate(match)
  }

  async function drawCertificate(person: AttendanceRow) {
    const canvas = canvasRef.current
    const url    = certTemplateUrl.current
    if (!canvas || !url) return

    await new Promise<void>(resolve => {
      const img = new Image()
      img.onload = () => {
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        const name = displayName(person)
        ctx.font         = `bold ${certFontSize.current}px Arial, "Helvetica Neue", sans-serif`
        ctx.fillStyle    = certFontColor.current
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name, canvas.width * (certNameX.current / 100), canvas.height * (certNameY.current / 100))

        setCanvasDataUrl(canvas.toDataURL('image/png'))
        setCertReady(true)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`
    })
  }

  function download() {
    if (!canvasDataUrl || !found) return
    const link = document.createElement('a')
    link.download = `${displayName(found)}-gerchilgee.png`
    link.href = canvasDataUrl
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function reset() {
    setPhone('')
    setFound(null)
    setNotFound(false)
    setNotCheckedIn(false)
    setCertReady(false)
    setCanvasDataUrl('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🎓 Гэрчилгээ авах</h1>
        {event && !event.is_active && (
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.2)', borderRadius: 8, padding: '3px 10px', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
            ✓ Сургалт дууссан — {event.title}
          </div>
        )}
        <p style={{ fontSize: 14, opacity: .8 }}>Бүртгэлийн утасны дугаараа оруулж гэрчилгээгээ татна уу</p>
      </div>

      <div style={{ maxWidth: 480, margin: '-1.5rem auto 0', padding: '0 1rem 6rem' }}>

        {/* Search box */}
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
          <button
            onClick={search}
            disabled={loading || eventLoading || !phone.trim()}
            style={{
              width: '100%', padding: '13px',
              background: phone.trim() && !eventLoading ? GRAD : '#e2e8f0',
              color: phone.trim() && !eventLoading ? '#fff' : '#94a3b8',
              borderRadius: 12, fontSize: 15, fontWeight: 700,
            }}
          >
            {loading ? 'Хайж байна...' : eventLoading ? 'Ачааллаж байна...' : 'Гэрчилгээ авах'}
          </button>
        </div>

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

        {/* Found but not checked in */}
        {notCheckedIn && found && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{displayName(found)}</p>
            <div style={{ marginTop: 10, padding: '10px 16px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
              <p style={{ fontSize: 14, color: '#dc2626', fontWeight: 600 }}>Та сургалтанд ирсэн бүртгэлгүй байна</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Гэрчилгээ авахын тулд ирцийн бүртгэлтэй байх шаардлагатай</p>
            </div>
            <button onClick={reset} style={{ marginTop: 14, padding: '11px 28px', background: GRAD, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
              Дахин оролдох
            </button>
          </div>
        )}

        {/* No template configured */}
        {found && !notCheckedIn && !certReady && !loading && !certTemplateUrl.current && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚙️</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Гэрчилгээний загвар тохируулаагүй байна</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Админ хэсгийн тохиргооноос загварыг тохируулна уу</p>
          </div>
        )}

        {/* Certificate ready */}
        {certReady && canvasDataUrl && found && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 4 }}>🎉</div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{displayName(found)}</p>
              <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Таны гэрчилгээ бэлэн боллоо</p>
            </div>

            {/* Preview */}
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 14 }}>
              <img src={canvasDataUrl} alt="certificate" style={{ width: '100%', display: 'block' }} />
            </div>

            <button
              onClick={download}
              style={{
                width: '100%', padding: '15px',
                background: GRAD, color: '#fff', borderRadius: 12, fontSize: 16, fontWeight: 800,
                boxShadow: '0 4px 20px rgba(0,145,148,.4)', marginBottom: 8,
              }}
            >
              ⬇ Гэрчилгээ татах (PNG)
            </button>
            <button onClick={reset}
              style={{ width: '100%', padding: '12px', background: '#f8fafc', color: '#64748b', borderRadius: 12, fontSize: 14, fontWeight: 600, border: '1px solid #e2e8f0' }}>
              Буцах
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
