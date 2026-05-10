import Drawer from '../ui/Drawer'
import Badge from '../ui/Badge'
import { fmt, billStatus, daysUntilDue } from '../../utils/calculations'
import { CalendarDays, DollarSign, User, CreditCard, Zap, RefreshCw, Edit2 } from 'lucide-react'

export default function BillDrawer({ bill, paid, onClose, onEdit, onTogglePaid }) {
  if (!bill) return <Drawer open={false} onClose={onClose} title="" />

  const status = billStatus(bill.dueDate, paid)
  const days = daysUntilDue(bill.dueDate)

  return (
    <Drawer open={!!bill} onClose={onClose} title={bill.name}>
      {/* Status + amount hero */}
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 12,
        padding: '20px',
        marginBottom: 20,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: paid ? 'var(--text-dim)' : 'var(--text)', marginBottom: 6 }}>
          {bill.varies ? '~' : ''}{fmt(bill.amount ?? bill.defaultAmount)}
        </div>
        <div style={{ marginBottom: 12 }}>
          <Badge variant={status} />
        </div>
        {!paid && days >= 0 && days <= 7 && (
          <div style={{ fontSize: 12, color: 'var(--amber)' }}>
            Due in {days === 0 ? 'today' : `${days} day${days !== 1 ? 's' : ''}`}
          </div>
        )}
      </div>

      {/* Details grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <DetailRow icon={<CalendarDays size={15} />} label="Due Date" value={`${bill.dueDate}th of every month`} />
        <DetailRow icon={<CreditCard size={15} />} label="Category" value={bill.category} />
        <DetailRow icon={<User size={15} />} label="Paid By" value={bill.paidBy ?? bill.paid_by} />
        <DetailRow icon={<DollarSign size={15} />} label="Account" value={bill.accountName ?? '—'} />
        <DetailRow icon={<Zap size={15} />} label="Autopay" value={bill.autopay ? 'Yes' : 'No'} />
        <DetailRow icon={<RefreshCw size={15} />} label="Amount" value={bill.varies ? 'Variable each month' : 'Fixed'} />
        {bill.notes && (
          <DetailRow icon={<span>📝</span>} label="Notes" value={bill.notes} />
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button
          className={`btn ${paid ? 'btn-ghost' : 'btn-green'}`}
          style={{ flex: 1 }}
          onClick={() => onTogglePaid?.(bill.id)}
        >
          {paid ? 'Mark Unpaid' : '✓ Mark Paid'}
        </button>
        {onEdit && (
          <button className="btn btn-ghost" onClick={() => onEdit(bill)}>
            <Edit2 size={14} /> Edit
          </button>
        )}
      </div>
    </Drawer>
  )
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text-dim)', width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
