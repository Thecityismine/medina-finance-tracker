export default function KPICard({ label, value, sub, icon, color = 'var(--text)', trend, trendLabel, onClick }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        userSelect: 'none',
      }}
      onMouseEnter={onClick ? (e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.04) inset'
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.boxShadow = 'var(--card-shadow)'
      } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 11, color: 'var(--text-dim)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 8,
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 26, fontWeight: 700, color,
            letterSpacing: '-0.8px', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
              {sub}
            </div>
          )}
          {trend !== undefined && (
            <div style={{
              fontSize: 12, marginTop: 6, fontWeight: 500,
              color: trend >= 0 ? 'var(--green)' : 'var(--red)',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}% {trendLabel ?? 'vs last month'}</span>
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 38, height: 38,
            borderRadius: 12,
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
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
