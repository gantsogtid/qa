'use client'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getActiveEvent } from '@/lib/supabase'

const HOME_ITEM   = { href: '/display',     icon: '🏠', label: 'Нүүр',            desktopOnly: true  }
const CHECKIN_ITEM = { href: '/checkin',    icon: '✅', label: 'Ирц',             desktopOnly: false }
const QUESTION_ITEM = { href: '/questions', icon: '💬', label: 'Асуулт',          desktopOnly: false }
const QUIZ_ITEM    = { href: '/quiz',       icon: '📝', label: 'Шалгалт',         desktopOnly: false }
const CERT_ITEM    = { href: '/certificate',icon: '🎓', label: 'Гэрчилгээ',       desktopOnly: false }
const CERT_ONLY    = [{ href: '/certificate',icon: '🎓', label: 'Гэрчилгээ авах', desktopOnly: false }]

export default function BottomNav() {
  const path = usePathname()
  const [hasActive, setHasActive]       = useState<boolean | null>(null)
  const [hasQuestions, setHasQuestions] = useState(true)
  const [hasQuiz, setHasQuiz]           = useState(false)
  const [hasCert, setHasCert]           = useState(false)

  useEffect(() => {
    getActiveEvent().then(e => {
      setHasActive(!!e)
      setHasQuestions(e?.has_questions !== false)
      setHasQuiz(!!(e?.has_quiz))
      setHasCert(!!(e?.cert_template_url?.trim()))
    })
  }, [])

  const items = hasActive === false
    ? CERT_ONLY
    : [
        HOME_ITEM,
        CHECKIN_ITEM,
        ...(hasQuestions ? [QUESTION_ITEM] : []),
        ...(hasQuiz      ? [QUIZ_ITEM]     : []),
        ...(hasCert      ? [CERT_ITEM]     : []),
      ]

  return (
    <nav className="bottom-nav">
      {items.map(({ href, icon, label, desktopOnly }) => (
        <a key={href} href={href}
          className={[path === href ? 'active' : '', desktopOnly ? 'desktop-only' : ''].join(' ').trim()}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </a>
      ))}
    </nav>
  )
}
