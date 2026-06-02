'use client'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/display', icon: '🏠', label: 'Нүүр хуудас' },
  { href: '/questions', icon: '💬', label: 'Асуулт' },
  { href: '/top', icon: '⭐', label: 'Топ 5' },
  { href: '/admin', icon: '👥', label: 'Ирц' },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="bottom-nav">
      {items.map(({ href, icon, label }) => (
        <a key={href} href={href} className={path === href ? 'active' : ''}>
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </a>
      ))}
    </nav>
  )
}
