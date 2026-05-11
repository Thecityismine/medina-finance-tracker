import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fmt } from '../../utils/calculations'

const COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#fb923c']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: d.payload.fill }}>{fmt(d.value)}</div>
      <div style={{ color: 'var(--text-muted)' }}>{d.payload.pct}% of total</div>
    </div>
  )
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.08) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x} y={y}
      fill="#fff"
      stroke="rgba(0,0,0,0.75)"
      strokeWidth={3}
      strokeLinejoin="round"
      paintOrder="stroke fill"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function CategoryChart({ bills }) {
  if (!bills?.length) return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
      No data
    </div>
  )

  const byCategory = {}
  for (const b of bills) {
    const cat = b.category || 'Other'
    byCategory[cat] = (byCategory[cat] || 0) + Number(b.amount ?? b.defaultAmount ?? 0)
  }
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0)
  const data = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round(value / total * 100) : 0 }))
    .sort((a, b) => b.value - a.value)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }}
          iconType="circle"
          iconSize={8}
          formatter={(value, entry) => (
            <span style={{ color: 'var(--text-muted)' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
