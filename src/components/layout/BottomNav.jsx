import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Receipt, CreditCard,
  Repeat, Settings, TrendingDown,
} from 'lucide-react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/monthly', icon: CalendarDays, label: 'Monthly' },
  { to: '/bills', icon: Receipt, label: 'Bills' },
  { to: '/debt', icon: TrendingDown, label: 'Debt' },
  { to: '/subscriptions', icon: Repeat, label: 'Subs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#0d0d0d',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '10px 4px',
            textDecoration: 'none',
            color: isActive ? 'var(--green)' : 'var(--text-dim)',
            fontSize: 10,
            fontWeight: isActive ? 600 : 400,
          })}
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
