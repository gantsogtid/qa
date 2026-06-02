import type { Metadata } from 'next'
import './globals.css'
import BottomNav from './components/BottomNav'

export const metadata: Metadata = {
  title: 'Асуулт & Хариулт',
  description: 'Live Q&A платформ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
