import { Edit2, Trash2, CheckCircle, SkipForward } from 'lucide-react'
import Badge from '../ui/Badge'
import { fmt, billStatus, daysUntilDue } from '../../utils/calculations'

export default function BillRow({ bill, paid, onTogglePaid, onEdit, onDelete, onSkip, onClick, showCheckbox = true }) {
  const dueDay = bill.dueDate ?? bill.due_date
  const status = billStatus(dueDay, paid)
  const days = daysUntilDue(dueDay)

  const ownerVariant = (bill.paidBy ?? bill.paid_by ?? '').toLowerCase()

  return (
    <tr
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {showCheckbox && (
        <td style={{ width: 36 }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!paid}
            onChange={() => onTogglePaid?.(bill.id)}
            title={paid ? 'Mark unpaid' : 'Mark paid'}
          />
        </td>
      )}
      <td>
        <div style={{ fontWeight: 500, color: paid ? 'var(--text-dim)' : 'var(--text)', textDecoration: paid ? 'line-through' : 'none' }}>
          {bill.name}
        </div>
        {bill.accountName && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{bill.accountName}</div>
        )}
      </td>
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {bill.category}
        </span>
      </td>
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {dueDay ? `${dueDay}th` : '—'}
          {!paid && days <= 7 && days >= 0 && (
            <span style={{ fontSize: 10, color: 'var(--amber)', marginLeft: 4 }}>
              ({days === 0 ? 'today' : `${days}d`})
            </span>
          )}
        </span>
      </td>
      <td>
        <span style={{ fontWeight: 600, color: paid ? 'var(--text-dim)' : 'var(--text)' }}>
          {bill.varies ? '~' : ''}{fmt(bill.amount ?? bill.defaultAmount ?? bill.default_amount)}
        </span>
      </td>
      <td>
        <Badge variant={ownerVariant} label={bill.paidBy ?? bill.paid_by} size="sm" />
      </td>
      <td>
        {bill.autopay
          ? <Badge variant="autopay" size="sm" />
          : <Badge variant="manual" size="sm" />}
      </td>
      <td>
        <Badge variant={status} size="sm" />
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {onEdit && (
            <button className="btn-icon btn-sm" onClick={() => onEdit(bill)} title="Edit">
              <Edit2 size={13} />
            </button>
          )}
          {onSkip && (
            <button className="btn-icon btn-sm" onClick={() => onSkip(bill)} title="Skip this month">
              <SkipForward size={13} />
            </button>
          )}
          {onDelete && (
            <button className="btn-icon btn-sm" onClick={() => onDelete(bill)} title="Delete" style={{ color: 'var(--red)' }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
