import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import { AuthModal } from '@/components/auth-modal'
import { AuthProvider } from '@/components/auth-provider'
import { CartProvider } from '@/components/cart-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MIKRO — микронаушники №1 | DISCRETION. CLARITY. POWER.',
  description:
    'Интернет-магазин микронаушников №1. Премиальные беспроводные микронаушники и индукционные комплекты: незаметность, чистый звук и мощность.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0d0f14',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`dark ${inter.variable} ${sora.variable}`}>
      <body className="bg-background font-sans antialiased">
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
          <AuthModal />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
