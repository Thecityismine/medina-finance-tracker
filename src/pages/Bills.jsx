import { useState, useMemo, useEffect } from 'react'
import { useFinance } from '../context/FinanceContext'
import BillDrawer from '../components/bills/BillDrawer'
import Modal from '../components/ui/Modal'
import { FormRow, ModalFooter } from '../components/ui/Modal'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import { fmt, daysUntilDue } from '../utils/calculations'
import {
  Plus, Search, ChevronDown, ChevronRight,
  Edit2, Trash2, X, Zap,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Due Soon', 'Autopay', 'Manual', 'Credit Cards', 'Rent', 'Utilities', 'Jorge', 'Anseli']
const CATEGORIES = ['Rent', 'Credit Card', 'Utility', 'Personal', 'Loan', 'Investment', 'Subscription']
const OWNERS = ['Jorge', 'Anseli']
const HIGH_COST = 500

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtK(n) {
  const v = n ?? 0
  const abs = Math.abs(v)
  if (abs >= 10000) return `$${Math.round(v / 1000)}K`
  if (abs >= 1000)  return `$${(v / 1000).toFixed(1)}K`
  return fmt(v)
}

function ordinal(n) {
  if (n >= 11 && n <= 13) return `${n}th`
  const s = ['th', 'st', 'nd', 'rd']
  return `${n}${s[n % 10] ?? 'th'}`
}

function billAmt(b) {
  return Number(b.amount ?? b.defaultAmount ?? b.default_amount ?? 0)
}

function defaultForm() {
  return { name: '', amount: '', dueDate: '', category: 'Utility', paidBy: 'Jorge', accountName: '', autopay: false, varies: false }
}

// ─── BillCard ─────────────────────────────────────────────────────────────────

function BillCard({ bill, onEdit, onDelete, onSelect }) {
  const dueDay = bill.dueDate ?? bill.due_date
  const days   = daysUntilDue(dueDay)
  const amount = billAmt(bill)
  const isHigh = amount >= HIGH_COST
  const isDue  = days >= 0 && days <= 7

  return (
    <div
      onClick={() => onSelect(bill)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px',
        borderBottom: '1px solid var(--border)',
        background: isHigh ? 'rgba(248,113,113,0.03)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = isHigh ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isHigh ? 'rgba(248,113,113,0.03)' : 'transparent' }}
    >
      {/* high-cost accent stripe */}
      {isHigh && (
        <div style={{ width: 3, height: 36, borderRadius: 2, background: 'var(--red)', flexShrink: 0 }} />
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 14, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 2,
        }}>
          {bill.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
          {bill.category}{bill.accountName ? ` · ${bill.accountName}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Badge variant={bill.autopay ? 'autopay' : 'manual'} size="sm" />
          <Badge variant={(bill.paidBy ?? bill.paid_by ?? '').toLowerCase()} label={bill.paidBy ?? bill.paid_by} size="sm" />
        </div>
      </div>

      {/* Amount + due */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: isHigh ? 'var(--red)' : 'var(--text)', letterSpacing: '-0.4px' }}>
          {bill.varies ? '~' : ''}{fmtK(amount)}
        </div>
        <div style={{ fontSize: 11, marginTop: 2, color: isDue ? 'var(--amber)' : 'var(--text-dim)', fontWeight: isDue ? 600 : 400 }}>
          {dueDay ? `${ordinal(dueDay)}` : '—'}
          {isDue && <span> · {days === 0 ? 'today' : `${days}d`}</span>}
        </div>
      </div>

      {/* Actions */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}
      >
        <button className="btn-icon btn-sm" onClick={() => onEdit(bill)} title="Edit"><Edit2 size={12} /></button>
        <button className="btn-icon btn-sm" onClick={() => onDelete(bill)} title="Delete" style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Bills() {
  const {
    bills, addBill, updateBill, deleteBill,
    monthlyChecks, loadMonthlyChecks, isBillPaid,
  } = useFinance()

  const now          = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [search, setSearch]               = useState('')
  const [filter, setFilter]               = useState('All')
  const [selectedBill, setSelectedBill]   = useState(null)
  const [showAdd, setShowAdd]             = useState(false)
  const [editBill, setEditBill]           = useState(null)
  const [form, setForm]                   = useState(defaultForm())
  const [showCategories, setShowCategories] = useState(false)
  const [groupCollapsed, setGroupCollapsed] = useState({})

  // Load this month's paid status for progress bar
  useEffect(() => { loadMonthlyChecks(currentYear, currentMonth) }, [loadMonthlyChecks])

  const activeBills = bills.filter((b) => b.active !== false)

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filteredBills = useMemo(() => {
    let list = activeBills
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((b) => b.name.toLowerCase().includes(q))
    }
    switch (filter) {
      case 'Due Soon':     list = list.filter((b) => { const d = daysUntilDue(b.dueDate ?? b.due_date); return d >= 0 && d <= 7 }); break
      case 'Autopay':      list = list.filter((b) => b.autopay); break
      case 'Manual':       list = list.filter((b) => !b.autopay); break
      case 'Credit Cards': list = list.filter((b) => b.category === 'Credit Card'); break
      case 'Rent':         list = list.filter((b) => b.category === 'Rent'); break
      case 'Utilities':    list = list.filter((b) => b.category === 'Utility'); break
      case 'Jorge':        list = list.filter((b) => (b.paidBy ?? b.paid_by) === 'Jorge'); break
      case 'Anseli':       list = list.filter((b) => (b.paidBy ?? b.paid_by) === 'Anseli'); break
    }
    return [...list].sort((a, b) => {
      const ad = Number(a.dueDate ?? a.due_date ?? 99)
      const bd = Number(b.dueDate ?? b.due_date ?? 99)
      return ad - bd || billAmt(b) - billAmt(a)
    })
  }, [activeBills, search, filter])

  // ── Summary metrics ────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const total    = activeBills.length
    const totalAmt = activeBills.reduce((s, b) => s + billAmt(b), 0)
    const autopay  = activeBills.filter((b) => b.autopay).length
    const dueSoon  = activeBills.filter((b) => { const d = daysUntilDue(b.dueDate ?? b.due_date); return d >= 0 && d <= 7 }).length
    const autopayPct = total > 0 ? Math.round((autopay / total) * 100) : 0
    return { total, totalAmt, autopay, autopayPct, dueSoon }
  }, [activeBills])

  // ── Monthly progress ───────────────────────────────────────────────────────

  const paidAmount = useMemo(() => {
    return activeBills.reduce((sum, b) => {
      return isBillPaid(b.id, currentYear, currentMonth) ? sum + billAmt(b) : sum
    }, 0)
  }, [activeBills, isBillPaid])

  const progressPct = summary.totalAmt > 0 ? Math.min(100, Math.round((paidAmount / summary.totalAmt) * 100)) : 0

  // ── Category totals ────────────────────────────────────────────────────────

  const categoryTotals = useMemo(() => {
    const cats = {}
    activeBills.forEach((b) => {
      const cat = b.category ?? 'Other'
      cats[cat] = (cats[cat] || 0) + billAmt(b)
    })
    return Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  }, [activeBills])

  // ── Group bills by due date ────────────────────────────────────────────────

  const groups = useMemo(() => {
    const nonZero = filteredBills.filter((b) => billAmt(b) > 0)
    const zero    = filteredBills.filter((b) => billAmt(b) === 0)

    const byDay = {}
    nonZero.forEach((b) => {
      const day = Number(b.dueDate ?? b.due_date ?? 0)
      const key = day > 0 ? day : 0
      if (!byDay[key]) byDay[key] = []
      byDay[key].push(b)
    })

    const result = Object.entries(byDay)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([day, bills]) => ({
        key: `day-${day}`,
        label: Number(day) > 0 ? `Due on the ${ordinal(Number(day))}` : 'No Due Date Set',
        total: bills.reduce((s, b) => s + billAmt(b), 0),
        bills,
      }))

    if (zero.length > 0) {
      result.push({ key: 'zero', label: '$0 / Variable Bills', total: 0, bills: zero })
    }

    return result
  }, [filteredBills])

  // ── Smart insights ─────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    const msgs = []
    const manualCount = activeBills.filter((b) => !b.autopay).length
    if (manualCount > 0) msgs.push(`${manualCount} bill${manualCount !== 1 ? 's' : ''} require manual payment`)

    const nextDue = activeBills
      .map((b) => ({ ...b, days: daysUntilDue(b.dueDate ?? b.due_date), amt: billAmt(b) }))
      .filter((b) => b.days >= 0 && b.days <= 14 && b.amt > 0)
      .sort((a, b) => a.days - b.days)[0]
    if (nextDue) {
      const when = nextDue.days === 0 ? 'today' : `in ${nextDue.days} day${nextDue.days !== 1 ? 's' : ''}`
      msgs.push(`Next due: ${nextDue.name} · ${fmt(nextDue.amt)} ${when}`)
    } else {
      msgs.push('No bills due in the next 14 days')
    }
    return msgs
  }, [activeBills])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleGroup = (key) => setGroupCollapsed((c) => ({ ...c, [key]: !c[key] }))

  const openEdit = (bill) => {
    setEditBill(bill)
    setForm({
      name:        bill.name,
      amount:      bill.amount ?? bill.defaultAmount ?? bill.default_amount ?? '',
      dueDate:     bill.dueDate ?? bill.due_date ?? '',
      category:    bill.category ?? 'Utility',
      paidBy:      bill.paidBy ?? bill.paid_by ?? 'Jorge',
      accountName: bill.accountName ?? '',
      autopay:     !!bill.autopay,
      varies:      !!bill.varies,
    })
    setSelectedBill(null)
  }

  const handleSave = async () => {
    const data = {
      name: form.name, amount: Number(form.amount) || 0,
      dueDate: Number(form.dueDate) || 1,
      category: form.category, paidBy: form.paidBy,
      accountName: form.accountName,
      autopay: form.autopay, varies: form.varies, recurring: true,
    }
    try {
      if (editBill) { await updateBill(editBill.id, data); setEditBill(null) }
      else { await addBill(data); setShowAdd(false) }
    } catch (e) { alert(`Save failed: ${e.message}`) }
  }

  const handleDelete = async (bill) => {
    if (confirm(`Delete "${bill.name}"?`)) await deleteBill(bill.id)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const isFiltered = filter !== 'All' || search.length > 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 80 }}>

      {/* ── 1. Header ── */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>Bills</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          {isFiltered
            ? `${filteredBills.length} of ${activeBills.length} bills`
            : `${activeBills.length} recurring monthly expenses`}
        </div>
      </div>

      {/* ── 2. Monthly Payment Progress ── */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)' }}>
            Paid This Month
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtK(paidAmount)}</span>
            {' '}of {fmtK(summary.totalAmt)}
            <span style={{ marginLeft: 8, color: progressPct >= 100 ? 'var(--green)' : 'var(--text-dim)', fontWeight: 600 }}>
              {progressPct}%
            </span>
          </div>
        </div>
        <div className="prog-track">
          <div
            className="prog-fill"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 100
                ? 'var(--green)'
                : progressPct >= 50
                  ? 'linear-gradient(90deg, var(--blue), var(--green))'
                  : 'var(--blue)',
            }}
          />
        </div>
      </div>

      {/* ── 3. 4 Core KPI Cards (2×2) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <KPICard
          label="Monthly Bills"
          value={fmtK(summary.totalAmt)}
          sub={`${summary.total} bill${summary.total !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="Total Bills"
          value={`${summary.total}`}
          sub={`${summary.autopay} autopay · ${summary.total - summary.autopay} manual`}
        />
        <KPICard
          label="Due Next 7 Days"
          value={`${summary.dueSoon}`}
          color={summary.dueSoon > 0 ? 'var(--amber)' : undefined}
          sub={summary.dueSoon > 0 ? 'needs attention' : 'all clear'}
        />
        <KPICard
          label="Autopay"
          value={`${summary.autopayPct}%`}
          color="var(--green)"
          sub={`${summary.autopay} of ${summary.total} bills`}
        />
      </div>

      {/* ── 4. Smart Insight Banner ── */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Zap size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {insights.map((msg, i) => (
            <div key={i} style={{ fontSize: 13, color: i === 0 ? 'var(--text-muted)' : 'var(--text-muted)', lineHeight: 1.4 }}>
              {msg}
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Sticky Search + Filter Chips ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', paddingTop: 8, paddingBottom: 8,
        marginBottom: 8, borderBottom: '1px solid var(--border)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input
            className="inp"
            placeholder="Search bills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, fontSize: 14 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="chips-scroll" style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: filter === f ? 600 : 400,
                border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: filter === f ? 'var(--green-dim)' : 'transparent',
                borderColor: filter === f ? 'var(--green-border)' : 'var(--border)',
                color: filter === f ? 'var(--green)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── 6. Category Breakdown (collapsible) ── */}
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => setShowCategories(!showCategories)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            background: 'none', border: '1px solid var(--border)', borderRadius: 10,
            padding: '9px 14px', cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: 13, fontWeight: 500, transition: 'border-color 0.15s',
          }}
        >
          {showCategories ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Spending by Category</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)' }}>
            {categoryTotals.length} categories
          </span>
        </button>

        {showCategories && (
          <div className="card" style={{ padding: '12px 16px', marginTop: 8 }}>
            {categoryTotals.map(([cat, total]) => {
              const pct = summary.totalAmt > 0 ? (total / summary.totalAmt) * 100 : 0
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{cat}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {fmtK(total)}
                      <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                        {Math.round(pct)}%
                      </span>
                    </span>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{ width: `${pct}%`, background: 'var(--blue)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 7. Grouped Bill Cards ── */}
      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 13 }}>
          No bills match this filter
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map((group) => {
            const isCollapsed = groupCollapsed[group.key]
            return (
              <div key={group.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', background: 'transparent', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {isCollapsed
                    ? <ChevronRight size={14} color="var(--text-dim)" />
                    : <ChevronDown size={14} color="var(--text-dim)" />}
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                    {group.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    ({group.bills.length})
                  </span>
                  {group.total > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {fmtK(group.total)}
                    </span>
                  )}
                </button>

                {/* Bill cards */}
                {!isCollapsed && group.bills.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onSelect={setSelectedBill}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── 8. Floating Action Button ── */}
      <button
        onClick={() => { setForm(defaultForm()); setShowAdd(true) }}
        title="Add Bill"
        style={{
          position: 'fixed', bottom: 80, right: 20,
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--green)', color: '#0a0a0a',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(52,211,153,0.45)',
          zIndex: 50, transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(52,211,153,0.6)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(52,211,153,0.45)'
        }}
      >
        <Plus size={26} />
      </button>

      {/* ── Bill Detail Drawer ── */}
      <BillDrawer
        bill={selectedBill}
        paid={false}
        onClose={() => setSelectedBill(null)}
        onEdit={openEdit}
      />

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={showAdd || !!editBill}
        onClose={() => { setShowAdd(false); setEditBill(null) }}
        title={editBill ? 'Edit Bill' : 'Add Bill'}
      >
        <FormRow label="Bill Name">
          <input className="inp" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Netflix" />
        </FormRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Amount ($)">
            <input className="inp" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </FormRow>
          <FormRow label="Due Date (1–31)">
            <input className="inp" type="number" min="1" max="31" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} placeholder="1" />
          </FormRow>
          <FormRow label="Category">
            <select className="inp" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </FormRow>
          <FormRow label="Paid By">
            <select className="inp" value={form.paidBy || ''} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}>
              {OWNERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormRow>
        </div>
        <FormRow label="Account / Payment Method">
          <input className="inp" value={form.accountName || ''} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="Chase Checking" />
        </FormRow>
        <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
            <input type="checkbox" checked={!!form.autopay} onChange={(e) => setForm({ ...form, autopay: e.target.checked })} />
            Autopay
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
            <input type="checkbox" checked={!!form.varies} onChange={(e) => setForm({ ...form, varies: e.target.checked })} />
            Amount varies each month
          </label>
        </div>
        <ModalFooter>
          <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setEditBill(null) }}>Cancel</button>
          <button className="btn btn-green" onClick={handleSave}>{editBill ? 'Save Changes' : 'Add Bill'}</button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
