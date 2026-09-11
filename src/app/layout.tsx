import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/Toast'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#EAE7DE',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Kasir Vian Jaya 08 — Seafood & Nasi Uduk',
  description: 'Aplikasi kasir untuk Warung Seafood & Nasi Uduk Vian Jaya 08',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kasir VJ',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${inter.variable} ${fraunces.variable}`} style={{ WebkitTapHighlightColor: 'transparent' }}>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
