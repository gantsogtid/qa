'use client'
export const dynamic = 'force-dynamic'
import { useState, useCallback } from 'react'
import { supabase, type AttendanceRow } from '@/lib/supabase'

const P  = '#009194'
const GRAD = `linear-gradient(135deg, #009194, #007072)`

type Step = 'search' | 'result' | 'already' | 'register' | 'done'

export default function CheckinPage() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<AttendanceRow[]>([])
  const [step, setStep]         = useState<Step>('search')
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<AttendanceRow | null>(null)
  const [checking, setChecking] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Registration form
  const [form, setForm] = useState({
    hospital: '', last_name: '', first_name: '',
    position_title: '', email: '', phone: '',
  })
  const [saving, setSaving] = useState(false)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setNotFound(false)
    const q = query.trim().toLowerCase()

    // Бүх өгөгдлийг татаж client дээр шүүх — баганын алдаанаас үл хамааран ажиллана
    const { data: all } = await supabase.from('attendance').select('*')
    setLoading(false)

    if (!all) {
      setNotFound(true)
      setResults([])
      return
    }

    const matched = all.filter(p => {
      const fields = [
        p.name, p.first_name, p.last_name,
        p.phone, p.hospital, p.email, p.position_title
      ]
      return fields.some(f => f && String(f).toLowerCase().includes(q))
    })

    if (matched.length === 0) {
      setNotFound(true)
      setResults([])
      setStep('search')
    } else {
      setResults(matched.slice(0, 10))
      setStep('result')
    }
  }, [query])

  async function checkin(person: AttendanceRow) {
    if (person.checked_in) { setSelected(person); setStep('already'); return }
    setChecking(true)
    await supabase.from('attendance').update({ checked_in: true }).eq('id', person.id)
    setSelected({ ...person, checked_in: true })
    setChecking(false)
    setStep('done')
  }

  async function register() {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setSaving(true)
    const name = `${form.first_name.trim()} ${form.last_name.trim()}`
    const { data } = await supabase
      .from('attendance')
      .insert({ ...form, name, checked_in: true })
      .select()
      .single()
    setSaving(false)
    setSelected(data)
    setStep('done')
  }

  function reset() {
    setQuery(''); setResults([]); setStep('search')
    setSelected(null); setNotFound(false)
    setForm({ hospital: '', last_name: '', first_name: '', position_title: '', email: '', phone: '' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
      {/* Header */}
      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>✅ Ирц бүртгэл</h1>
        <p style={{ fontSize: 14, opacity: .8 }}>Нэр эсвэл утасны дугаараар хайж бүртгүүлнэ үү</p>
      </div>

      <div style={{ maxWidth: 520, margin: '-1.5rem auto 0', padding: '0 1rem 6rem' }}>

        {/* ── Search step ── */}
        {(step === 'search' || step === 'result') && (
          <>
            <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>🔍 Өөрийгөө хайх</p>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Нэр эсвэл утасны дугаар..."
                style={{ marginBottom: 10, fontSize: 16 }}
                autoFocus
              />
              <button onClick={search} disabled={loading || !query.trim()}
                style={{ width: '100%', padding: '13px', background: query.trim() ? GRAD : '#e2e8f0', color: query.trim() ? '#fff' : '#94a3b8', borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: query.trim() ? '0 4px 16px rgba(0,145,148,.35)' : 'none' }}>
                {loading ? 'Хайж байна...' : 'Хайх'}
              </button>
            </div>

            {notFound && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🤔</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>"{query}" олдсонгүй</p>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Та урьдчилан бүртгэлгүй байна уу?</p>
                <button onClick={() => { setStep('register'); setForm(f => ({ ...f, phone: /^\d+$/.test(query) ? query : '' })) }}
                  style={{ padding: '10px 28px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,145,148,.3)' }}>
                  + Шинээр бүртгүүлэх
                </button>
              </div>
            )}

            {results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', padding: '0 4px' }}>
                  {results.length} үр дүн олдлоо
                </p>
                {results.map(p => (
                  <div key={p.id} style={{
                    background: '#fff', borderRadius: 16, padding: '1rem 1.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                    border: `1.5px solid ${p.checked_in ? '#bbf7d0' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                        {p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.name}
                      </p>
                      {p.hospital && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 1 }}>{p.hospital}</p>}
                      {p.position_title && <p style={{ fontSize: 12, color: '#94a3b8' }}>{p.position_title}</p>}
                      {p.checked_in && <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>✓ Аль хэдийн бүртгүүлсэн</p>}
                    </div>
                    <button
                      onClick={() => checkin(p)}
                      disabled={checking}
                      style={{
                        flexShrink: 0, padding: '10px 18px', borderRadius: 12,
                        background: p.checked_in ? '#f0fdf4' : GRAD,
                        color: p.checked_in ? '#16a34a' : '#fff',
                        border: p.checked_in ? '1.5px solid #86efac' : 'none',
                        fontSize: 14, fontWeight: 700,
                        boxShadow: p.checked_in ? 'none' : '0 4px 12px rgba(0,145,148,.3)',
                      }}
                    >
                      {p.checked_in ? '✓ Ирсэн' : 'Ирлээ ✓'}
                    </button>
                  </div>
                ))}

                <button onClick={() => setStep('register')}
                  style={{ padding: '10px', background: 'transparent', color: '#64748b', border: '1.5px dashed #cbd5e1', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                  Олдсонгүй — Шинээр бүртгүүлэх
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Register step ── */}
        {step === 'register' && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={reset} style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', color: '#64748b', fontSize: 13 }}>← Буцах</button>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Шинэ бүртгэл</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'hospital',       label: 'Эмнэлэг / Байгууллага',  req: false },
                { key: 'last_name',      label: 'Овог',                    req: true  },
                { key: 'first_name',     label: 'Нэр',                     req: true  },
                { key: 'position_title', label: 'Албан тушаал',            req: false },
                { key: 'email',          label: 'И-мэйл',                  req: false },
                { key: 'phone',          label: 'Утасны дугаар',           req: false },
              ].map(f => (
                <div key={f.key}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    {f.label}{f.req && <span style={{ color: '#dc2626' }}> *</span>}
                  </p>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.label}
                    style={{ fontSize: 14 }}
                  />
                </div>
              ))}

              <button
                onClick={register}
                disabled={saving || !form.first_name.trim() || !form.last_name.trim()}
                style={{
                  marginTop: 4, padding: '13px',
                  background: form.first_name && form.last_name ? GRAD : '#e2e8f0',
                  color: form.first_name && form.last_name ? '#fff' : '#94a3b8',
                  borderRadius: 12, fontSize: 15, fontWeight: 700,
                  boxShadow: form.first_name && form.last_name ? '0 4px 16px rgba(0,145,148,.35)' : 'none',
                }}
              >
                {saving ? 'Бүртгэж байна...' : 'Бүртгүүлж ирлээ ✓'}
              </button>
            </div>
          </div>
        )}

        {/* ── Done step ── */}
        {(step === 'done' || step === 'already') && selected && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem 1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {step === 'already' ? '😊' : '🎉'}
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
              {step === 'already' ? 'Аль хэдийн бүртгүүлсэн байна!' : 'Тавтай морилно уу!'}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: P, marginBottom: 4 }}>
              {selected.first_name && selected.last_name
                ? `${selected.first_name} ${selected.last_name}`
                : selected.name}
            </p>
            {selected.hospital && <p style={{ fontSize: 14, color: '#64748b', marginBottom: 2 }}>{selected.hospital}</p>}
            {selected.position_title && <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>{selected.position_title}</p>}

            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '12px 20px', marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>✓ Ирц амжилттай бүртгэгдлээ</p>
            </div>

            <button onClick={reset}
              style={{ padding: '12px 32px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,145,148,.3)' }}>
              Дараагийн хүн
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
