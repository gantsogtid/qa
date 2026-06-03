'use client'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/checkin',   icon: '✅', label: 'Ирц'        },
  { href: '/questions', icon: '💬', label: 'Асуулт'     },
  { href: '/admin',     icon: '⚙️', label: 'Удирдлага'  },
]

export default function BottomNav() {
  const path = usePathname()
  // /display хуудсанд nav харуулахгүй (проектор дэлгэц)
  if (path === '/display') return null

  return (
    <nav className="bottom-nav">
      {items.map(({ href, icon, label }) => (
        <a key={label} href={href} className={path === href ? 'active' : ''}>
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </a>
      ))}
    </nav>
  )
}
