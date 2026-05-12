import { fmt, fmtPct, sumBills } from '../../utils/calculations'
import Badge from '../ui/Badge'

export default function PaycheckCard({
  period, label, income, bills, paidBills = [],
  subscriptions = [], paidSubs = [], onTogglePaid, year, month,
}) {
  const billTotal = sumBills(bills)
  const subTotal  = subscriptions.reduce((s, sub) => s + Number(sub.amount || 0), 0)
  const totalBills = billTotal + subTotal

  const paidBillsAmount = sumBills(bills.filter((b) => paidBills.includes(b.id)))
  const paidSubsAmount  = subscriptions.filter((s) => paidSubs.includes(s.id)).reduce((acc, s) => acc + Number(s.amount || 0), 0)
  const paidTotal       = paidBillsAmount + paidSubsAmount

  const leftover   = income - totalBills
  const pct        = income > 0 ? Math.round(totalBills / income * 100) : 0
  const paidCount  = paidBills.filter((id) => bills.find((b) => b.id === id)).length + paidSubs.filter((id) => subscriptions.find((s) => s.id === id)).length
  const totalCount = bills.length + subscriptions.length

  const byCategory = {}
  for (const b of bills) {
    const cat = b.category || 'Other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(b)
  }

  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
            Period {period} · {label}
          </div>
          <Badge variant={leftover >= 0 ? 'paid' : 'overdue'} label={leftover >= 0 ? 'Balanced' : 'Short'} size="sm" />
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.5px' }}>
          {fmt(income)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>paycheck income</div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <Stat label="Total Bills" value={fmt(totalBills)} />
        <Stat label="Leftover" value={fmt(leftover)} color={leftover >= 0 ? 'var(--green)' : 'var(--red)'} />
        <Stat label="Committed" value={fmtPct(pct)} color={pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--text)'} />
      </div>

      {/* Paid progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
          <span>Paid progress</span>
          <span style={{ color: 'var(--text-muted)' }}>{paidCount}/{totalCount} items · {fmt(paidTotal)} of {fmt(totalBills)}</span>
        </div>
        <div className="prog-track">
          <div
            className="prog-fill"
            style={{
              width: totalBills > 0 ? `${Math.min(100, (paidTotal / totalBills) * 100)}%` : '0%',
              background: paidTotal >= totalBills ? 'var(--green)' : 'var(--blue)',
            }}
          />
        </div>
      </div>

      <div className="divider" style={{ margin: '0 0 12px' }} />

      {/* Bills by category */}
      {Object.entries(byCategory).map(([cat, catBills]) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
            color: 'var(--text-dim)', marginBottom: 6,
          }}>
            {cat} · {fmt(sumBills(catBills))}
          </div>
          {catBills.map((bill) => {
            const isPaid = paidBills.includes(bill.id)
            return (
              <div
                key={bill.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={() => onTogglePaid?.(bill.id, year, month)}
                  style={{ flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: isPaid ? 'var(--text-dim)' : 'var(--text)',
                    textDecoration: isPaid ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {bill.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', gap: 6, marginTop: 1 }}>
                    <span>Due {bill.dueDate ?? bill.due_date}th</span>
                    {bill.autopay && <span style={{ color: 'var(--green)' }}>· Auto</span>}
                    <span>· {bill.paidBy ?? bill.paid_by}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: isPaid ? 'var(--text-dim)' : 'var(--text)', flexShrink: 0 }}>
                  {bill.varies ? '~' : ''}{fmt(bill.amount ?? bill.defaultAmount ?? bill.default_amount)}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {bills.length === 0 && subscriptions.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: '20px 0' }}>
          No bills in this period
        </div>
      )}

      {/* Subscriptions section */}
      {subscriptions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
            color: 'var(--blue)', marginBottom: 6,
          }}>
            Subscriptions · {fmt(subTotal)}
          </div>
          {subscriptions.map((sub) => {
            const isPaid = paidSubs.includes(sub.id)
            return (
              <div
                key={sub.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={() => onTogglePaid?.(sub.id, year, month)}
                  style={{ flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: isPaid ? 'var(--text-dim)' : 'var(--text)',
                    textDecoration: isPaid ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sub.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', gap: 6, marginTop: 1 }}>
                    <span>{sub.frequency}</span>
                    {sub.paymentMethod && <span>· {sub.paymentMethod}</span>}
                    {sub.owner && <span>· {sub.owner}</span>}
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: isPaid ? 'var(--text-dim)' : 'var(--text)', flexShrink: 0 }}>
                  {fmt(sub.amount)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
