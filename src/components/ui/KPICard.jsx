export default function KPICard({ label, value, sub, icon, color = 'var(--text)', trend, onClick }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={onClick ? (e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.background = 'var(--surface-2)'
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--surface)'
      } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.5px', lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>
              {sub}
            </div>
          )}
          {trend !== undefined && (
            <div style={{ fontSize: 12, marginTop: 4, color: trend >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last month
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 36, height: 36,
            borderRadius: 8,
            background: 'var(--surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: 'var(--text-muted)',
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
