import React from 'react'
import type { Metadata } from 'next'
import { Playfair_Display, Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

import { ThemeProvider } from '@/components/theme-provider'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Model School, Manvad - Quality Education for Secondary & Higher Secondary',
  description:
    'Model School Manvad offers quality education for classes 6th-12th with emphasis on science stream. Shaping young minds for a better tomorrow.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${inter.variable} ${geistMono.variable} font-sans antialiased relative`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {/* Premium animated background blobs */}
          <div className="fixed inset-0 w-full h-full -z-10 bg-background overflow-hidden">
            <div className="absolute top-[-20%] left-[-15%] w-[65%] h-[65%] bg-primary/15 dark:bg-primary/8 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[120px] animate-blob" />
            <div className="absolute top-[-10%] right-[-15%] w-[55%] h-[55%] bg-accent/12 dark:bg-accent/6 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[120px] animate-blob animation-delay-2000" />
            <div className="absolute bottom-[-20%] left-[25%] w-[55%] h-[60%] bg-primary/10 dark:bg-primary/6 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[120px] animate-blob animation-delay-4000" />
          </div>

          <div className="relative z-0 flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
