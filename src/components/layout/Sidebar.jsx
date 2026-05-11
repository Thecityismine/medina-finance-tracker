import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Receipt,
  Repeat, Settings, TrendingDown, ShoppingBag,
} from 'lucide-react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monthly', icon: CalendarDays, label: 'Monthly Plan' },
  { to: '/bills', icon: Receipt, label: 'Bills' },
  { to: '/debt', icon: TrendingDown, label: 'Debt' },
  { to: '/subscriptions', icon: Repeat, label: 'Subscriptions' },
  { to: '/expenses', icon: ShoppingBag, label: 'Expenses' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minWidth: 'var(--sidebar-w)',
      background: '#0d0d0d',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <TrendingDown size={18} color="#0a0a0a" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              Medina Finance
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
              Family Tracker
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--green)' : 'var(--text-muted)',
              background: isActive ? 'var(--green-dim)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={16} strokeWidth={isActive => isActive ? 2.5 : 1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-dim)',
        fontSize: 11,
      }}>
        © 2025 Medina Family
      </div>
    </aside>
  )
}
