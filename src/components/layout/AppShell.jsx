import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/monthly': 'Monthly Plan',
  '/bills': 'Bills',
  '/debt': 'Debt',
  '/subscriptions': 'Subscriptions',
  '/settings': 'Settings',
}

export default function AppShell() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Medina Finance'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="hidden-mobile">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Mobile header */}
        <header className="mobile-header" style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: '#0d0d0d',
          display: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#0a0a0a' }}>M</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{title}</span>
          </div>
        </header>

        <div style={{
          flex: 1,
          padding: '28px 32px',
          overflowY: 'auto',
          paddingBottom: '80px', // room for bottom nav on mobile
        }} className="main-scroll">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="show-mobile">
        <BottomNav />
      </div>

      <style>{`
        @media (min-width: 769px) {
          .hidden-mobile { display: block !important; }
          .show-mobile { display: none !important; }
          .mobile-header { display: none !important; }
          .main-scroll { padding-bottom: 28px !important; }
        }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
          .mobile-header { display: flex !important; }
          .main-scroll { padding: 20px 16px 80px !important; }
        }
      `}</style>
    </div>
  )
}
