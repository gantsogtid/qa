'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, getActiveEvent, type EventTopic } from '@/lib/supabase'

const P    = '#009194'
const GRAD = `linear-gradient(135deg, #009194, #007072)`

const FIELDS = [
  { key: 'last_name',      label: 'Овог',                  req: true,  type: 'text' },
  { key: 'first_name',     label: 'Нэр',                   req: true,  type: 'text' },
  { key: 'phone',          label: 'Утасны дугаар',         req: false, type: 'tel'  },
  { key: 'hospital',       label: 'Эмнэлэг / Байгууллага', req: false, type: 'text' },
  { key: 'position_title', label: 'Албан тушаал',          req: false, type: 'text' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({
    last_name: '', first_name: '', phone: '',
    hospital: '', position_title: '', email: '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [activeEvent, setActiveEvent] = useState<EventTopic | null>(null)

  useEffect(() => {
    getActiveEvent().then(setActiveEvent)
  }, [])

  const canSubmit = !!activeEvent && !!form.last_name.trim() && !!form.first_name.trim()

  async function submit() {
    if (!canSubmit) return
    if (!activeEvent) {
      setError('Идэвхтэй сэдэв олдсонгүй. Админ хэсгээс шинэ сэдэв үүсгэнэ үү.')
      return
    }
    setSaving(true)
    setError(null)
    const name = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ')
    const { error: err } = await supabase.from('attendance').insert({
      ...form, name, checked_in: true, event_id: activeEvent.id,
    })
    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      setDone(true)
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 380, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,.1)' }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Тавтай морилно уу!</h1>
          <p style={{ fontSize: 20, fontWeight: 700, color: P, marginBottom: 4 }}>
            {[form.first_name, form.last_name].filter(Boolean).join(' ')}
          </p>
          {form.hospital && <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>{form.hospital}</p>}
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '14px 20px' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>✓ Ирц амжилттай бүртгэгдлээ</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📝 Бүртгэл</h1>
        <p style={{ fontSize: 14, opacity: .8 }}>Мэдээллээ бөглөж ирцээ бүртгүүлнэ үү</p>
      </div>

      <div style={{ maxWidth: 480, margin: '-1.5rem auto 0', padding: '0 1rem 6rem' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FIELDS.map(f => (
              <div key={f.key}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>
                  {f.label}{f.req && <span style={{ color: '#dc2626' }}> *</span>}
                </p>
                <input
                  type={f.type}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.label}
                  style={{ fontSize: 15 }}
                />
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={saving || !canSubmit}
            style={{
              marginTop: 16, width: '100%', padding: '15px',
              background: canSubmit ? GRAD : '#e2e8f0',
              color: canSubmit ? '#fff' : '#94a3b8',
              borderRadius: 14, fontSize: 16, fontWeight: 800,
              boxShadow: canSubmit ? '0 4px 20px rgba(0,145,148,.4)' : 'none',
            }}
          >
            {saving ? 'Бүртгэж байна...' : 'Бүртгүүлж ирлээ ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
