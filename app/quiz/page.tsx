'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { supabase, getActiveEvent, type EventTopic, type QuizQuestion } from '@/lib/supabase'

const P    = '#009194'
const GRAD = 'linear-gradient(135deg, #009194, #007072)'
const MAX_ATTEMPTS = 3
const PASS_PCT     = 80

type Phase = 'phone' | 'quiz' | 'result'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizPage() {
  const [phase, setPhase]             = useState<Phase>('phone')
  const [phone, setPhone]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [activeEvent, setActiveEvent] = useState<EventTopic | null>(null)
  const [eventLoading, setEventLoading] = useState(true)

  const [questions, setQuestions]     = useState<QuizQuestion[]>([])
  const [answers, setAnswers]         = useState<Record<string, number>>({})
  const [personName, setPersonName]   = useState('')
  const [attemptNum, setAttemptNum]   = useState(1)

  const [score, setScore]             = useState(0)
  const [total, setTotal]             = useState(0)
  const [passed, setPassed]           = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [alreadyPassed, setAlreadyPassed] = useState(false)
  const [noAttemptsLeft, setNoAttemptsLeft] = useState(false)

  useEffect(() => {
    getActiveEvent().then(e => { setActiveEvent(e); setEventLoading(false) })
  }, [])

  async function startQuiz() {
    if (!phone.trim() || !activeEvent) return
    setLoading(true); setError('')

    // Ирц шалгах
    const digits = phone.replace(/\D/g, '')
    const { data: att } = await supabase
      .from('attendance').select('*')
      .eq('event_id', activeEvent.id).eq('checked_in', true)

    const match = (att || []).find(p => {
      if (!p.phone) return false
      return String(p.phone).replace(/\D/g, '') === digits || String(p.phone).trim() === phone.trim()
    })

    if (!match) {
      setError('Та энэ сургалтад ирцийн бүртгэлгүй байна. Эхлээд ирцийн бүртгэл хийнэ үү.')
      setLoading(false); return
    }

    const name = [match.last_name, match.first_name].filter(Boolean).join(' ') || match.name || ''
    setPersonName(name)

    // Өмнөх оролдлогуудыг шалгах
    const { data: prev } = await supabase
      .from('quiz_results').select('*')
      .eq('event_id', activeEvent.id).eq('phone', phone.trim())
      .order('created_at', { ascending: true })

    const prevList = prev || []

    if (prevList.some(r => r.passed)) {
      const pr = prevList.find(r => r.passed)!
      setScore(pr.score); setTotal(pr.total); setPassed(true)
      setAttemptNum(pr.attempt_num); setAlreadyPassed(true); setAttemptsLeft(0)
      setLoading(false); setPhase('result'); return
    }

    if (prevList.length >= MAX_ATTEMPTS) {
      const last = prevList[prevList.length - 1]
      setScore(last.score); setTotal(last.total); setPassed(false)
      setAttemptNum(MAX_ATTEMPTS); setNoAttemptsLeft(true); setAttemptsLeft(0)
      setLoading(false); setPhase('result'); return
    }

    setAttemptNum(prevList.length + 1)
    setAttemptsLeft(MAX_ATTEMPTS - prevList.length)

    // Асуулт ачаалах
    const { data: eqq } = await supabase
      .from('event_quiz_questions')
      .select('question_id, quiz_questions(id, question, options, correct_index)')
      .eq('event_id', activeEvent.id) as { data: { question_id: string; quiz_questions: QuizQuestion }[] | null; error: unknown }

    if (!eqq || eqq.length === 0) {
      setError('Энэ сургалтад шалгалтын асуулт тохируулаагүй байна.')
      setLoading(false); return
    }

    setQuestions(shuffle(eqq.map(e => e.quiz_questions)))
    setAnswers({})
    setLoading(false); setPhase('quiz')
  }

  async function submitQuiz() {
    if (!activeEvent) return
    const unanswered = questions.filter(q => answers[q.id] === undefined).length
    if (unanswered > 0) {
      alert(`${unanswered} асуултад хариулаагүй байна.`)
      return
    }
    setLoading(true)

    let correct = 0
    questions.forEach(q => { if (answers[q.id] === q.correct_index) correct++ })
    const tot = questions.length
    const didPass = Math.round((correct / tot) * 100) >= PASS_PCT

    await supabase.from('quiz_results').insert({
      event_id: activeEvent.id,
      phone: phone.trim(),
      name: personName,
      score: correct,
      total: tot,
      passed: didPass,
      attempt_num: attemptNum,
    })

    setScore(correct); setTotal(tot); setPassed(didPass)
    if (!didPass) setAttemptsLeft(a => Math.max(0, a - 1))
    setLoading(false); setPhase('result')
  }

  function retake() {
    setPhase('phone'); setQuestions([]); setAnswers({})
    setAlreadyPassed(false); setNoAttemptsLeft(false); setError('')
  }

  const answeredCount = Object.keys(answers).length

  /* ── Render ── */

  if (eventLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>Ачааллаж байна...</p>
      </div>
    )
  }

  if (!activeEvent || !activeEvent.has_quiz) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>
        <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>📝 Шалгалт</h1>
        </div>
        <div style={{ maxWidth: 480, margin: '-1.5rem auto 0', padding: '0 1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Одоогоор шалгалт байхгүй байна</p>
            <p style={{ fontSize: 13, color: '#64748b' }}>Шалгалт идэвхжүүлэгдэх үед энд орж болно</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f4' }}>

      {/* Header */}
      <div style={{ background: GRAD, padding: '1.75rem 1.25rem 3rem', color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>📝 Шалгалт</h1>
        <p style={{ fontSize: 13, opacity: .8 }}>{activeEvent.title}</p>
      </div>

      <div style={{ maxWidth: 520, margin: '-1.5rem auto 0', padding: '0 1rem 6rem' }}>

        {/* ── Phone phase ── */}
        {phase === 'phone' && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Бүртгэлийн утасны дугаараа оруулна уу</p>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Шалгалт өгөхийн өмнө ирцийн бүртгэлтэй байх шаардлагатай
            </p>
            <input
              value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startQuiz()}
              placeholder="99001122" type="tel"
              style={{ marginBottom: 10, fontSize: 20, textAlign: 'center', fontWeight: 700, letterSpacing: 2 }}
              autoFocus
            />
            {error && (
              <div style={{ marginBottom: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>
                ⚠️ {error}
              </div>
            )}
            <button onClick={startQuiz} disabled={loading || !phone.trim()}
              style={{
                width: '100%', padding: '13px',
                background: phone.trim() ? GRAD : '#e2e8f0',
                color: phone.trim() ? '#fff' : '#94a3b8',
                borderRadius: 12, fontSize: 15, fontWeight: 700,
              }}>
              {loading ? 'Шалгаж байна...' : 'Шалгалт эхлэх'}
            </button>
          </div>
        )}

        {/* ── Quiz phase ── */}
        {phase === 'quiz' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Info */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{personName}</p>
                <p style={{ fontSize: 12, color: '#64748b' }}>{attemptNum}-р оролдлого · {attemptsLeft} оролдлого үлдсэн</p>
              </div>
              <div style={{ background: '#e6f6f6', borderRadius: 10, padding: '6px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: P }}>{answeredCount}/{questions.length}</p>
                <p style={{ fontSize: 10, color: '#64748b' }}>хариулсан</p>
              </div>
            </div>

            {/* Questions */}
            {questions.map((q, qi) => (
              <div key={q.id} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: P, marginBottom: 6 }}>{qi + 1}-р асуулт</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12, lineHeight: 1.5 }}>{q.question}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, oi) => {
                    const selected = answers[q.id] === oi
                    return (
                      <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                        style={{
                          padding: '11px 14px', borderRadius: 10, textAlign: 'left', fontSize: 13,
                          background: selected ? '#e6f6f6' : '#f8fafc',
                          border: `1.5px solid ${selected ? P : '#e2e8f0'}`,
                          color: selected ? P : '#1e293b',
                          fontWeight: selected ? 700 : 400,
                          display: 'flex', gap: 10, alignItems: 'center',
                        }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: selected ? P : '#e2e8f0',
                          color: selected ? '#fff' : '#64748b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800,
                        }}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Submit */}
            <button onClick={submitQuiz} disabled={loading || answeredCount < questions.length}
              style={{
                width: '100%', padding: '15px',
                background: answeredCount === questions.length ? GRAD : '#e2e8f0',
                color: answeredCount === questions.length ? '#fff' : '#94a3b8',
                borderRadius: 12, fontSize: 16, fontWeight: 800,
                boxShadow: answeredCount === questions.length ? '0 4px 20px rgba(0,145,148,.4)' : 'none',
              }}>
              {loading ? 'Шалгаж байна...' : answeredCount < questions.length
                ? `${questions.length - answeredCount} асуулт хариулаагүй байна`
                : 'Шалгалт дуусгах ✓'}
            </button>
          </div>
        )}

        {/* ── Result phase ── */}
        {phase === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Main result card */}
            <div style={{
              background: '#fff', borderRadius: 20, padding: '2rem 1.5rem',
              boxShadow: '0 8px 32px rgba(0,0,0,.1)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>
                {passed ? '🎉' : attemptsLeft > 0 ? '😔' : '🚫'}
              </div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>{personName}</p>

              {/* Score circle */}
              <div style={{
                width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
                background: passed ? '#f0fdf4' : '#fef2f2',
                border: `3px solid ${passed ? '#16a34a' : '#dc2626'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: passed ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
                  {score}/{total}
                </p>
                <p style={{ fontSize: 12, color: passed ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {total > 0 ? Math.round((score / total) * 100) : 0}%
                </p>
              </div>

              {/* Status */}
              {alreadyPassed && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>✓ Та аль хэдийн тэнцсэн байна</p>
                </div>
              )}
              {!alreadyPassed && passed && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>🎉 Тэнцлээ! Баяр хүргэе!</p>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>80% ба түүнээс дээш оноо авлаа</p>
                </div>
              )}
              {!passed && noAttemptsLeft && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>3 удаа оролдлогын хязгаарт хүрлээ</p>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Дэлгэрэнгүй мэдээллийг зохион байгуулагчаас лавлана уу</p>
                </div>
              )}
              {!passed && !noAttemptsLeft && !alreadyPassed && (
                <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#92400e' }}>Тэнцсэнгүй</p>
                  <p style={{ fontSize: 13, color: '#78350f', marginTop: 4 }}>
                    80% буюу {total > 0 ? Math.ceil(total * 0.8) : 8} ба түүнээс дээш оноо шаардлагатай.
                    Та {attemptsLeft} удаа дахин оролдох боломжтой.
                  </p>
                </div>
              )}

              {/* Attempt info */}
              {!alreadyPassed && (
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                  {attemptNum}-р оролдлого · {MAX_ATTEMPTS} удаагаас
                </p>
              )}

              {/* Actions */}
              {!passed && !noAttemptsLeft && attemptsLeft > 0 && (
                <button onClick={retake}
                  style={{ width: '100%', padding: '13px', background: GRAD, color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 20px rgba(0,145,148,.4)' }}>
                  Дахин оролдох ({attemptsLeft} удаа үлдсэн)
                </button>
              )}
              {(passed || noAttemptsLeft) && (
                <button onClick={retake}
                  style={{ width: '100%', padding: '13px', background: '#f8fafc', color: '#64748b', borderRadius: 12, fontSize: 14, fontWeight: 600, border: '1px solid #e2e8f0', marginTop: 4 }}>
                  Буцах
                </button>
              )}
            </div>

            {/* Show wrong answers if failed */}
            {!passed && !alreadyPassed && questions.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Хариултын дүн</p>
                {questions.map((q, qi) => {
                  const userAns = answers[q.id]
                  const correct = userAns === q.correct_index
                  return (
                    <div key={q.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: qi < questions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <p style={{ fontSize: 12, color: correct ? '#16a34a' : '#dc2626', fontWeight: 700, marginBottom: 3 }}>
                        {correct ? '✓' : '✕'} {qi + 1}-р асуулт
                      </p>
                      <p style={{ fontSize: 13, color: '#1e293b', marginBottom: 4 }}>{q.question}</p>
                      {!correct && userAns !== undefined && (
                        <p style={{ fontSize: 12, color: '#dc2626' }}>
                          Таны хариулт: {String.fromCharCode(65 + userAns)}. {q.options[userAns]}
                        </p>
                      )}
                      {!correct && (
                        <p style={{ fontSize: 12, color: '#16a34a' }}>
                          Зөв хариулт: {String.fromCharCode(65 + q.correct_index)}. {q.options[q.correct_index]}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
