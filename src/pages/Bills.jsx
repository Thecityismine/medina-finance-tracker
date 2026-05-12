import { useState, useMemo } from 'react'
import { useFinance } from '../context/FinanceContext'
import BillRow from '../components/bills/BillRow'
import BillDrawer from '../components/bills/BillDrawer'
import Modal from '../components/ui/Modal'
import { FormRow, ModalFooter } from '../components/ui/Modal'
import KPICard from '../components/ui/KPICard'
import { fmt, daysUntilDue } from '../utils/calculations'
import { Plus, Search } from 'lucide-react'

const FILTERS = ['All', 'Autopay', 'Manual', 'Credit Cards', 'Rent', 'Utilities', 'Jorge', 'Anseli']

const CATEGORIES = ['Rent', 'Credit Card', 'Utility', 'Personal', 'Loan', 'Investment', 'Subscription']
const OWNERS = ['Jorge', 'Anseli']

export default function Bills() {
  const { bills, addBill, updateBill, deleteBill } = useFinance()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [sortKey, setSortKey] = useState('dueDate')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedBill, setSelectedBill] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editBill, setEditBill] = useState(null)
  const [form, setForm] = useState(defaultForm())

  const activeBills = bills.filter((b) => b.active !== false)

  const filteredBills = useMemo(() => {
    let list = activeBills

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((b) => b.name.toLowerCase().includes(q))
    }

    switch (filter) {
      case 'Autopay':      list = list.filter((b) => b.autopay); break
      case 'Manual':       list = list.filter((b) => !b.autopay); break
      case 'Credit Cards': list = list.filter((b) => b.category === 'Credit Card'); break
      case 'Rent':         list = list.filter((b) => b.category === 'Rent'); break
      case 'Utilities':    list = list.filter((b) => b.category === 'Utility'); break
      case 'Jorge':        list = list.filter((b) => (b.paidBy ?? b.paid_by) === 'Jorge'); break
      case 'Anseli':       list = list.filter((b) => (b.paidBy ?? b.paid_by) === 'Anseli'); break
    }

    return [...list].sort((a, b) => {
      let av = a[sortKey] ?? a[snakeCase(sortKey)] ?? ''
      let bv = b[sortKey] ?? b[snakeCase(sortKey)] ?? ''
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      const dir = sortDir === 'asc' ? 1 : -1
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }, [activeBills, search, filter, sortKey, sortDir])

  const summary = useMemo(() => {
    const totalAmt = activeBills.reduce((s, b) => s + Number(b.amount ?? b.defaultAmount ?? b.default_amount ?? 0), 0)
    const autopay = activeBills.filter((b) => b.autopay).length
    const dueSoon = activeBills.filter((b) => { const d = daysUntilDue(b.dueDate ?? b.due_date); return d >= 0 && d <= 7 }).length
    return { totalAmt, autopay, dueSoon, total: activeBills.length }
  }, [activeBills])

  const sort = (key) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const sortIcon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const openAdd = () => { setForm(defaultForm()); setShowAdd(true) }

  const openEdit = (bill) => {
    setEditBill(bill)
    setForm({
      name: bill.name,
      amount: bill.amount ?? bill.defaultAmount ?? bill.default_amount ?? '',
      dueDate: bill.dueDate ?? bill.due_date ?? '',
      category: bill.category ?? 'Utility',
      paidBy: bill.paidBy ?? bill.paid_by ?? 'Jorge',
      accountName: bill.accountName ?? '',
      autopay: !!bill.autopay,
      varies: !!bill.varies,
    })
    setSelectedBill(null)
  }

  const handleSave = async () => {
    const data = {
      name: form.name,
      amount: Number(form.amount) || 0,
      dueDate: Number(form.dueDate) || 1,
      category: form.category,
      paidBy: form.paidBy,
      accountName: form.accountName,
      autopay: form.autopay,
      varies: form.varies,
      recurring: true,
    }
    try {
      if (editBill) { await updateBill(editBill.id, data); setEditBill(null) }
      else { await addBill(data); setShowAdd(false) }
    } catch (e) {
      alert(`Save failed: ${e.message}`)
    }
  }

  const handleDelete = async (bill) => {
    if (confirm(`Delete "${bill.name}"?`)) await deleteBill(bill.id)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>Bills</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage recurring monthly expenses — mark paid on Monthly Plan
          </div>
        </div>
        <button className="btn btn-green" onClick={openAdd}>
          <Plus size={15} /> Add Bill
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KPICard label="Total Monthly" value={fmt(summary.totalAmt)} />
        <KPICard label="Total Bills" value={`${summary.total}`} />
        <KPICard label="Autopay" value={`${summary.autopay}`} color="var(--green)" />
        <KPICard label="Manual" value={`${summary.total - summary.autopay}`} />
        <KPICard label="Due Next 7 Days" value={`${summary.dueSoon}`} color={summary.dueSoon > 0 ? 'var(--amber)' : 'var(--text)'} />
      </div>

      {/* Search + filters */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              className="inp"
              placeholder="Search bills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px', borderRadius: 99, fontSize: 12,
                fontWeight: filter === f ? 600 : 400, border: '1px solid', cursor: 'pointer',
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

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th onClick={() => sort('name')}>Name{sortIcon('name')}</th>
                <th onClick={() => sort('category')}>Category{sortIcon('category')}</th>
                <th onClick={() => sort('dueDate')}>Due{sortIcon('dueDate')}</th>
                <th onClick={() => sort('amount')}>Amount{sortIcon('amount')}</th>
                <th onClick={() => sort('paidBy')}>Owner{sortIcon('paidBy')}</th>
                <th>Autopay</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  onClick={() => setSelectedBill(bill)}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
          {filteredBills.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 13 }}>
              No bills match this filter
            </div>
          )}
        </div>
      </div>

      {/* Bill Detail Drawer */}
      <BillDrawer
        bill={selectedBill}
        paid={false}
        onClose={() => setSelectedBill(null)}
        onEdit={openEdit}
      />

      {/* Add/Edit Modal */}
      <Modal open={showAdd || !!editBill} onClose={() => { setShowAdd(false); setEditBill(null) }} title={editBill ? 'Edit Bill' : 'Add Bill'}>
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
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

function defaultForm() {
  return { name: '', amount: '', dueDate: '', category: 'Utility', paidBy: 'Jorge', accountName: '', autopay: false, varies: false }
}

function snakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}
