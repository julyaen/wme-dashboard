import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import FilterPanel from '@/components/FilterPanel'

export const metadata: Metadata = {
  title: 'whatsmyedge',
  description: 'MNQ futures trading analytics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <StoreProvider>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <Topbar />
            <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {children}
            </main>
          </div>
          <FilterPanel />
        </StoreProvider>
      </body>
    </html>
  )
}
