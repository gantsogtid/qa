'use client'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/display',   icon: '🏠', label: 'Нүүр',      desktopOnly: true  },
  { href: '/checkin',   icon: '✅', label: 'Ирц',        desktopOnly: false },
  { href: '/questions', icon: '💬', label: 'Асуулт',     desktopOnly: false },
  { href: '/admin',     icon: '⚙️', label: 'Удирдлага',  desktopOnly: false },
]

export default function BottomNav() {
  const path = usePathname()
  // /display хуудсанд nav харуулахгүй (проектор дэлгэц)
  if (path === '/display') return null

  return (
    <nav className="bottom-nav">
      {items.map(({ href, icon, label, desktopOnly }) => (
        <a key={label} href={href}
          className={[path === href ? 'active' : '', desktopOnly ? 'desktop-only' : ''].join(' ').trim()}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </a>
      ))}
    </nav>
  )
}
