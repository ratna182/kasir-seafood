import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'Kasir Vian Jaya 08 — Seafood & Nasi Uduk',
  description: 'Aplikasi kasir untuk Warung Seafood & Nasi Uduk Vian Jaya 08',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
