import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'arXiv RAG — Chat with Research Papers',
  description: 'Search, ingest, and chat with arXiv research papers using AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-brand-600 flex items-center gap-2">
              <span className="text-2xl">Research RAG</span>
            </Link>
            <nav className="flex gap-6 text-sm font-medium text-gray-600">
              <Link href="/" className="hover:text-brand-600">Search</Link>
              <Link href="/papers" className="hover:text-brand-600">Library</Link>
              <Link href="/eval" className="hover:text-brand-600">Eval Dashboard</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
