import { Edit2, Trash2 } from 'lucide-react'
import Badge from '../ui/Badge'
import { fmt, daysUntilDue } from '../../utils/calculations'

export default function BillRow({ bill, onEdit, onDelete, onClick }) {
  const dueDay = bill.dueDate ?? bill.due_date
  const days = daysUntilDue(dueDay)

  const ownerVariant = (bill.paidBy ?? bill.paid_by ?? '').toLowerCase()

  return (
    <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <td>
        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{bill.name}</div>
        {bill.accountName && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{bill.accountName}</div>
        )}
      </td>
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{bill.category}</span>
      </td>
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {dueDay ? `${dueDay}th` : '—'}
          {days <= 7 && days >= 0 && (
            <span style={{ fontSize: 10, color: 'var(--amber)', marginLeft: 4 }}>
              ({days === 0 ? 'today' : `${days}d`})
            </span>
          )}
        </span>
      </td>
      <td>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          {bill.varies ? '~' : ''}{fmt(bill.amount ?? bill.defaultAmount ?? bill.default_amount)}
        </span>
      </td>
      <td>
        <Badge variant={ownerVariant} label={bill.paidBy ?? bill.paid_by} size="sm" />
      </td>
      <td>
        {bill.autopay ? <Badge variant="autopay" size="sm" /> : <Badge variant="manual" size="sm" />}
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {onEdit && (
            <button className="btn-icon btn-sm" onClick={() => onEdit(bill)} title="Edit">
              <Edit2 size={13} />
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
