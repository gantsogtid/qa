'use client'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getActiveEvent } from '@/lib/supabase'

const ALL_ITEMS = [
  { href: '/display',     icon: '🏠', label: 'Нүүр',         desktopOnly: true  },
  { href: '/checkin',     icon: '✅', label: 'Ирц',           desktopOnly: false },
  { href: '/questions',   icon: '💬', label: 'Асуулт',        desktopOnly: false },
  { href: '/certificate', icon: '🎓', label: 'Гэрчилгээ',     desktopOnly: false },
]

const CERT_ONLY = [
  { href: '/certificate', icon: '🎓', label: 'Гэрчилгээ авах', desktopOnly: false },
]

export default function BottomNav() {
  const path = usePathname()
  const [hasActive, setHasActive] = useState<boolean | null>(null)

  useEffect(() => {
    getActiveEvent().then(e => setHasActive(!!e))
  }, [])

  // null = loading: show all to avoid flicker; false = no active event: cert only
  const items = hasActive === false ? CERT_ONLY : ALL_ITEMS

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
