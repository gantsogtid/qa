'use client'
export const dynamic = 'force-dynamic'
import { useState, useCallback } from 'react'
import { supabase, type AttendanceRow } from '@/lib/supabase'

const P    = '#009194'
const GRAD = `linear-gradient(135deg, #009194, #007072)`

type Step = 'search' | 'result' | 'register' | 'done'

function displayName(p: AttendanceRow) {
  const parts = [p.last_name, p.first_name].filter(Boolean)
  return parts.length ? parts.join(' ') : p.name || ''
}

export default function CheckinPage() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<AttendanceRow[]>([])
  const [step, setStep]       = useState<Step>('search')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Modal — confirm / edit before checkin
  const [modal, setModal]     = useState<AttendanceRow | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState<AttendanceRow | null>(null)

  // Self-register form
  const [regForm, setRegForm] = useState({ last_name: '', first_name: '', phone: '', hospital: '', position_title: '', email: '' })
  const [registering, setRegistering] = useState(false)

  /* ── Search ── */
  const search = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setNotFound(false)

    const { data: all, error } = await supabase.from('attendance').select('*')
    setLoading(false)

    if (error || !all) { setNotFound(true); return }

    const q = query.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')

    const matched = all.filter(p => {
      const textFields = [p.name, p.first_name, p.last_name, p.hospital, p.email, p.position_title]
      if (textFields.some(f => f && String(f).toLowerCase().includes(q))) return true
      // Утасны дугаар — тоогоор харьцуулах
      if (p.phone) {
        const ph = String(p.phone).replace(/\D/g, '')
        if (ph && qDigits && ph.includes(qDigits)) return true
        if (String(p.phone).toLowerCase().includes(q)) return true
      }
      return false
    })

    if (matched.length === 0) {
      setNotFound(true); setResults([]); setStep('search')
    } else {
      setResults(matched.slice(0, 15)); setStep('result')
    }
  }, [query])

  /* ── Open modal ── */
  function openModal(person: AttendanceRow) {
    setModal(person)
    setEditForm({
      last_name:      person.last_name      || '',
      first_name:     person.first_name     || '',
      phone:          person.phone          || '',
      hospital:       person.hospital       || '',
      position_title: person.position_title || '',
      email:          person.email          || '',
    })
  }

  /* ── Confirm check-in ── */
  async function confirmCheckin() {
    if (!modal) return
    setSaving(true)
    const name = [editForm.first_name, editForm.last_name].filter(Boolean).join(' ') || modal.name
    await supabase.from('attendance').update({ ...editForm, name, checked_in: true }).eq('id', modal.id)
    const updated = { ...modal, ...editForm, name, checked_in: true } as AttendanceRow
    setDone(updated)
    setModal(null)
    setSaving(false)
    setStep('done')
  }

  /* ── Self-register ── */
  async function register() {
    if (!regForm.first_name.trim() && !regForm.last_name.trim()) return
    setRegistering(true)
    const name = [regForm.first_name.trim(), regForm.last_name.trim()].filter(Boolean).join(' ')
    const { data } = await supabase.from('attendance').insert({ ...regForm, name, checked_in: true }).select().single()
    setDone(data)
    setRegistering(false)
    setStep('done')
  }

  function reset() {
    setQuery(''); setResults([]); setStep('search')
    setNotFound(false); setDone(null)
    setRegForm({ last_name: '', first_name: '', phone: '', hospital: '', position_title: '', email: '' })
  }

  /* ══════════════ RENDER ══════════════ */
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>

      {/* Header */}
      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>✅ Ирц бүртгэл</h1>
        <p style={{ fontSize: 14, opacity: .8 }}>Нэр эсвэл утасны дугаараар хайна уу</p>
      </div>

      <div style={{ maxWidth: 520, margin: '-1.5rem auto 0', padding: '0 1rem 6rem' }}>

        {/* ── Search ── */}
        {(step === 'search' || step === 'result') && (
          <>
            <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>🔍 Өөрийгөө хайх</p>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Овог, нэр эсвэл утасны дугаар..."
                style={{ marginBottom: 10, fontSize: 16 }}
                autoFocus
              />
              <button onClick={search} disabled={loading || !query.trim()}
                style={{ width: '100%', padding: '13px', background: query.trim() ? GRAD : '#e2e8f0', color: query.trim() ? '#fff' : '#94a3b8', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
                {loading ? 'Хайж байна...' : 'Хайх'}
              </button>
            </div>

            {/* Not found */}
            {notFound && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: 10 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🤔</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>"{query}" олдсонгүй</p>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>Та урьдчилан бүртгэлгүй байна уу?</p>
                <button onClick={() => setStep('register')}
                  style={{ padding: '10px 28px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700 }}>
                  + Шинээр бүртгүүлэх
                </button>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', padding: '0 4px' }}>{results.length} үр дүн</p>

                {results.map(p => (
                  <div key={p.id} style={{
                    background: '#fff', borderRadius: 16, padding: '1rem 1.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                    border: `1.5px solid ${p.checked_in ? '#bbf7d0' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Овог Нэр — томоор bold */}
                      <p style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>
                        {displayName(p)}
                      </p>
                      {/* Утасны дугаар */}
                      {p.phone && (
                        <p style={{ fontSize: 15, fontWeight: 700, color: P, marginBottom: 3 }}>
                          📱 {p.phone}
                        </p>
                      )}
                      {/* Эмнэлэг */}
                      {p.hospital && (
                        <p style={{ fontSize: 13, color: '#64748b' }}>{p.hospital}</p>
                      )}
                      {p.checked_in && (
                        <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>✓ Аль хэдийн бүртгүүлсэн</p>
                      )}
                    </div>
                    <button
                      onClick={() => openModal(p)}
                      style={{
                        flexShrink: 0, padding: '10px 18px', borderRadius: 12,
                        background: p.checked_in ? '#f0fdf4' : GRAD,
                        color: p.checked_in ? '#16a34a' : '#fff',
                        border: p.checked_in ? '1.5px solid #86efac' : 'none',
                        fontSize: 14, fontWeight: 700,
                        boxShadow: p.checked_in ? 'none' : '0 4px 12px rgba(0,145,148,.3)',
                      }}
                    >
                      {p.checked_in ? '✓ Ирсэн' : 'Ирлээ →'}
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

        {/* ── Register ── */}
        {step === 'register' && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={reset} style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 12px', color: '#64748b', fontSize: 13 }}>← Буцах</button>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Шинэ бүртгэл</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'last_name',      label: 'Овог',                  req: true  },
                { key: 'first_name',     label: 'Нэр',                   req: true  },
                { key: 'phone',          label: 'Утасны дугаар',         req: false },
                { key: 'hospital',       label: 'Эмнэлэг / Байгууллага', req: false },
                { key: 'position_title', label: 'Албан тушаал',          req: false },
              ].map(f => (
                <div key={f.key}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    {f.label}{f.req && <span style={{ color: '#dc2626' }}> *</span>}
                  </p>
                  <input value={(regForm as any)[f.key]} onChange={e => setRegForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.label} style={{ fontSize: 14 }} />
                </div>
              ))}
              <button onClick={register} disabled={registering || (!regForm.first_name.trim() && !regForm.last_name.trim())}
                style={{ marginTop: 4, padding: '13px', background: (regForm.first_name || regForm.last_name) ? GRAD : '#e2e8f0', color: (regForm.first_name || regForm.last_name) ? '#fff' : '#94a3b8', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
                {registering ? 'Бүртгэж байна...' : 'Бүртгүүлж ирлээ ✓'}
              </button>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && done && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem 1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Тавтай морилно уу!</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: P, marginBottom: 4 }}>{displayName(done)}</p>
            {done.phone && <p style={{ fontSize: 16, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>📱 {done.phone}</p>}
            {done.hospital && <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>{done.hospital}</p>}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '12px 20px', marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>✓ Ирц амжилттай бүртгэгдлээ</p>
            </div>
            <button onClick={reset} style={{ padding: '12px 32px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700 }}>
              Дараагийн хүн
            </button>
          </div>
        )}
      </div>

      {/* ══ MODAL — Мэдээлэл шалгах / засах ══ */}
      {modal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
        >
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 520, margin: '0 auto', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem 1.25rem 2rem' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>Мэдээллээ шалгаарай</p>
              <button onClick={() => setModal(null)} style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', color: '#64748b', fontSize: 16 }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              Мэдээлэл зөв бол "Ирлээ" дарна уу. Буруу байвал засаарай.
            </p>

            {/* Edit fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { key: 'last_name',      label: 'Овог',                  bold: true  },
                { key: 'first_name',     label: 'Нэр',                   bold: true  },
                { key: 'phone',          label: 'Утасны дугаар',         bold: true  },
                { key: 'hospital',       label: 'Эмнэлэг / Байгууллага', bold: false },
                { key: 'position_title', label: 'Албан тушаал',          bold: false },
              ].map(f => (
                <div key={f.key}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{f.label}</p>
                  <input
                    value={editForm[f.key] || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.label}
                    style={{ fontSize: f.bold ? 16 : 14, fontWeight: f.bold ? 600 : 400 }}
                  />
                </div>
              ))}
            </div>

            {/* Confirm button */}
            <button
              onClick={confirmCheckin}
              disabled={saving}
              style={{ width: '100%', padding: '15px', background: GRAD, color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 800, boxShadow: '0 4px 20px rgba(0,145,148,.4)' }}
            >
              {saving ? 'Хадгалж байна...' : '✓ Мэдээлэл зөв — Ирлээ!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
