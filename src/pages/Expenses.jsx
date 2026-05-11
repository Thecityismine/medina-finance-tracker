import { useState, useMemo, useRef } from 'react'
import { useFinance } from '../context/FinanceContext'
import KPICard from '../components/ui/KPICard'
import Modal from '../components/ui/Modal'
import { FormRow, ModalFooter } from '../components/ui/Modal'
import { fmt, fmtFull } from '../utils/calculations'
import { Plus, Camera, Trash2, Edit2, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'

const CATEGORIES = [
  'Groceries', 'Dining Out', 'Transportation', 'Fuel',
  'Doctor Visits', 'Pharmacy', 'Education', 'Kids School',
  'Shopping', 'Entertainment', 'Travel', 'Gifts', 'Technology',
  'Home Maintenance', 'Auto Repair', 'Miscellaneous',
]

const CATEGORY_EMOJI = {
  'Groceries': '🛒',
  'Dining Out': '🍽️',
  'Transportation': '🚗',
  'Fuel': '⛽',
  'Doctor Visits': '🏥',
  'Pharmacy': '💊',
  'Education': '🎓',
  'Kids School': '🏫',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Travel': '✈️',
  'Gifts': '🎁',
  'Technology': '📱',
  'Home Maintenance': '🔧',
  'Auto Repair': '🔩',
  'Miscellaneous': '📂',
}

const CATEGORY_COLOR = {
  'Groceries': 'var(--green)',
  'Dining Out': 'var(--amber)',
  'Transportation': 'var(--blue)',
  'Fuel': 'var(--amber)',
  'Doctor Visits': 'var(--red)',
  'Pharmacy': 'var(--red)',
  'Education': 'var(--blue)',
  'Shopping': 'var(--text-muted)',
  'Entertainment': 'var(--text-muted)',
  'Travel': 'var(--blue)',
  'Gifts': 'var(--text-muted)',
  'Technology': 'var(--blue)',
  'Home Maintenance': 'var(--amber)',
  'Auto Repair': 'var(--amber)',
  'Kids School': 'var(--blue)',
  'Miscellaneous': 'var(--text-dim)',
}

function defaultForm() {
  return {
    amount: '',
    category: 'Groceries',
    merchant: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  }
}

export default function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useFinance()

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [catFilter, setCatFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [editExp, setEditExp] = useState(null)
  const [form, setForm] = useState(defaultForm())
  const [receiptImg, setReceiptImg] = useState(null)
  const fileRef = useRef(null)

  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.date) return false
      const d = new Date(e.date + 'T00:00:00')
      return d.getFullYear() === viewYear && d.getMonth() + 1 === viewMonth
    })
  }, [expenses, viewYear, viewMonth])

  const yearExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.date) return false
      return new Date(e.date + 'T00:00:00').getFullYear() === viewYear
    })
  }, [expenses, viewYear])

  const filtered = useMemo(() => {
    let list = monthExpenses
    if (catFilter !== 'All') list = list.filter((e) => e.category === catFilter)
    return [...list].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [monthExpenses, catFilter])

  const metrics = useMemo(() => {
    const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    const yearTotal = yearExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
    const avgPerDay = daysInMonth > 0 ? monthTotal / daysInMonth : 0
    const catTotals = {}
    for (const e of monthExpenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount || 0)
    }
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]
    return { monthTotal, yearTotal, avgPerDay, topCat, catTotals }
  }, [monthExpenses, yearExpenses, viewYear, viewMonth])

  const handlePrev = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12) }
    else setViewMonth((m) => m - 1)
  }
  const handleNext = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1) }
    else setViewMonth((m) => m + 1)
  }
  const handleToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth() + 1) }

  const openAdd = () => { setForm(defaultForm()); setReceiptImg(null); setEditExp(null); setShowAdd(true) }
  const openEdit = (expense) => {
    setEditExp(expense)
    setForm({
      amount: expense.amount ?? '',
      category: expense.category ?? 'Groceries',
      merchant: expense.merchant ?? '',
      date: expense.date ?? format(new Date(), 'yyyy-MM-dd'),
      notes: expense.notes ?? '',
    })
    setReceiptImg(null)
    setShowAdd(true)
  }

  const closeModal = () => { setShowAdd(false); setEditExp(null); setReceiptImg(null) }

  const handleCapture = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setReceiptImg(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    const data = {
      amount: Number(form.amount) || 0,
      category: form.category,
      merchant: form.merchant,
      date: form.date,
      notes: form.notes,
    }
    try {
      if (editExp) { await updateExpense(editExp.id, data) }
      else { await addExpense(data) }
      closeModal()
    } catch (err) {
      alert(`Save failed: ${err.message}`)
    }
  }

  const handleDelete = async (expense) => {
    if (confirm('Delete this expense?')) await deleteExpense(expense.id)
  }

  const monthName = format(new Date(viewYear, viewMonth - 1, 1), 'MMMM yyyy')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>Expenses</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Track daily spending by category</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={handlePrev}><ChevronLeft size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={handleToday} style={{ minWidth: 130 }}>
            <CalendarCheck size={13} />{monthName}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleNext}><ChevronRight size={14} /></button>
          <button className="btn btn-green" onClick={openAdd}><Plus size={14} /> Add Expense</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KPICard label="This Month" value={fmt(metrics.monthTotal)} color="var(--red)" />
        <KPICard label={`${viewYear} Total`} value={fmt(metrics.yearTotal)} />
        <KPICard label="Avg Per Day" value={fmtFull(metrics.avgPerDay)} />
        {metrics.topCat && (
          <KPICard label="Top Category" value={metrics.topCat[0]} sub={fmt(metrics.topCat[1])} />
        )}
        <KPICard label="Transactions" value={`${monthExpenses.length}`} />
      </div>

      {/* Category breakdown */}
      {Object.keys(metrics.catTotals).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 14 }}>
            Spending by Category · {monthName}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(metrics.catTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => {
                const pct = metrics.monthTotal > 0 ? (total / metrics.monthTotal) * 100 : 0
                const isActive = catFilter === cat
                return (
                  <div key={cat} style={{ cursor: 'pointer' }} onClick={() => setCatFilter(isActive ? 'All' : cat)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: isActive ? 'var(--text)' : 'var(--text-muted)', fontWeight: isActive ? 700 : 400 }}>
                        {CATEGORY_EMOJI[cat]} {cat}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{fmt(total)} · {Math.round(pct)}%</span>
                    </div>
                    <div className="prog-track">
                      <div
                        className="prog-fill"
                        style={{ width: `${pct}%`, background: isActive ? (CATEGORY_COLOR[cat] ?? 'var(--blue)') : 'var(--surface-2)', transition: 'width 0.3s' }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {['All', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            style={{
              padding: '4px 12px', borderRadius: 99, fontSize: 12,
              fontWeight: catFilter === cat ? 600 : 400, border: '1px solid', cursor: 'pointer',
              background: catFilter === cat ? 'var(--green-dim)' : 'transparent',
              borderColor: catFilter === cat ? 'var(--green-border)' : 'var(--border)',
              color: catFilter === cat ? 'var(--green)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expense list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 13 }}>
            No expenses recorded{catFilter !== 'All' ? ` for ${catFilter}` : ''} in {monthName}
          </div>
        ) : (
          filtered.map((expense) => (
            <div
              key={expense.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {CATEGORY_EMOJI[expense.category] ?? '📂'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {expense.merchant || expense.category}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span>{expense.category}</span>
                  {expense.date && <span>· {expense.date}</span>}
                  {expense.notes && <span>· {expense.notes}</span>}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', flexShrink: 0 }}>
                {fmtFull(expense.amount)}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn-icon btn-sm" onClick={() => openEdit(expense)}><Edit2 size={13} /></button>
                <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(expense)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showAdd} onClose={closeModal} title={editExp ? 'Edit Expense' : 'Add Expense'}>
        {/* Receipt scanner — only on add */}
        {!editExp && (
          <div style={{ marginBottom: 16 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCapture}
            />
            {receiptImg ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={receiptImg}
                  alt="Receipt preview"
                  style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 8, background: 'var(--surface-2)', display: 'block' }}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setReceiptImg(null); fileRef.current.value = '' }}
                  style={{ position: 'absolute', top: 6, right: 6 }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '12px 0', borderRadius: 8,
                  border: '1px dashed var(--border)', background: 'transparent',
                  color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Camera size={16} /> Scan Receipt (optional)
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Amount ($)">
            <input className="inp" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          </FormRow>
          <FormRow label="Date">
            <input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FormRow>
        </div>
        <FormRow label="Category">
          <select className="inp" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </FormRow>
        <FormRow label="Merchant / Store">
          <input className="inp" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="e.g. Walmart, Chipotle" />
        </FormRow>
        <FormRow label="Notes (optional)">
          <input className="inp" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra detail" />
        </FormRow>

        <ModalFooter>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="btn btn-green" onClick={handleSave}>{editExp ? 'Save' : 'Add'}</button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
