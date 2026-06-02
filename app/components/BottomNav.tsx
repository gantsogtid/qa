'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function BottomNav() {
  const path = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const items = [
    { href: isMobile ? '/questions' : '/display', activeHrefs: ['/display', '/questions'], icon: '🏠', label: 'Нүүр хуудас' },
    { href: '/questions', activeHrefs: ['/questions'], icon: '💬', label: 'Асуулт' },
    { href: '/admin', activeHrefs: ['/admin'], icon: '⚙️', label: 'Удирдлага' },
  ]

  return (
    <nav className="bottom-nav">
      {items.map(({ href, activeHrefs, icon, label }) => (
        <a key={label} href={href} className={activeHrefs.includes(path) ? 'active' : ''}>
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </a>
      ))}
    </nav>
  )
}
