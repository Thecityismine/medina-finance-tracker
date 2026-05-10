import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt } from '../../utils/calculations'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function DebtChart({ creditCards }) {
  if (!creditCards?.length) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
      No debt data
    </div>
  )

  const data = creditCards
    .filter((c) => Number(c.balance) > 0)
    .map((c) => ({
      name: c.name.replace(' Min', '').replace(' Rewards', '').replace(' Double Cash', ''),
      Balance: Number(c.balance),
      Limit: Number(c.creditLimit ?? c.credit_limit ?? 0) - Number(c.balance),
    }))
    .sort((a, b) => b.Balance - a.Balance)
    .slice(0, 8)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="Balance" fill="#ef4444" radius={[0, 4, 4, 0]} stackId="a" />
        <Bar dataKey="Limit" fill="var(--surface-3)" radius={[0, 4, 4, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}
