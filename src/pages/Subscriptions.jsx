import { useState, useMemo } from 'react'
import { useFinance } from '../context/FinanceContext'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormRow, ModalFooter } from '../components/ui/Modal'
import { fmt, daysUntilDue } from '../utils/calculations'
import { Plus, Edit2, Trash2, Calendar, DollarSign } from 'lucide-react'

const FREQUENCIES = ['All', 'Monthly', 'Quarterly', '6 Months', 'Yearly']
const OWNERS = ['All', 'Jorge', 'Anseli']

function annualCost(sub) {
  const amt = Number(sub.amount || 0)
  switch (sub.frequency) {
    case 'Monthly':   return amt * 12
    case 'Quarterly': return amt * 4
    case '6 Months':  return amt * 2
    case 'Yearly':    return amt
    default:          return amt * 12
  }
}

function monthlyEquivalent(sub) {
  return annualCost(sub) / 12
}

export default function Subscriptions() {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useFinance()

  const [freqFilter, setFreqFilter] = useState('All')
  const [ownerFilter, setOwnerFilter] = useState('All')
  const [sortKey, setSortKey] = useState('amount')
  const [sortDir, setSortDir] = useState('desc')
  const [showAdd, setShowAdd] = useState(false)
  const [editSub, setEditSub] = useState(null)
  const [form, setForm] = useState(defaultForm())

  const activeSubs = subscriptions.filter((s) => s.active !== false)

  const filtered = useMemo(() => {
    let list = activeSubs
    if (freqFilter !== 'All') list = list.filter((s) => s.frequency === freqFilter)
    if (ownerFilter !== 'All') list = list.filter((s) => s.owner === ownerFilter)
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const dir = sortDir === 'asc' ? 1 : -1
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }, [activeSubs, freqFilter, ownerFilter, sortKey, sortDir])

  const metrics = useMemo(() => {
    const annual = activeSubs.reduce((s, sub) => s + annualCost(sub), 0)
    const monthly = activeSubs.filter((s) => s.frequency === 'Monthly').reduce((s, sub) => s + Number(sub.amount || 0), 0)
    const todayDay = new Date().getDate()
    const dueThisMonth = activeSubs.filter((s) => {
      if (s.frequency !== 'Monthly') return false
      return Number(s.dueDate) >= todayDay
    }).length
    const nextRenewal = activeSubs
      .map((s) => ({ ...s, days: daysUntilDue(s.dueDate) }))
      .filter((s) => s.days >= 0)
      .sort((a, b) => a.days - b.days)[0]
    return { annual, monthly, dueThisMonth, nextRenewal }
  }, [activeSubs])

  const sort = (key) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const sortIcon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const openEdit = (sub) => {
    setEditSub(sub)
    setForm({
      name: sub.name, amount: sub.amount, dueDate: sub.dueDate,
      frequency: sub.frequency, owner: sub.owner ?? 'Jorge',
      nextBillingDate: sub.nextBillingDate ?? '',
      paymentMethod: sub.paymentMethod ?? '',
    })
  }

  const handleSave = async () => {
    const data = {
      name: form.name, amount: Number(form.amount) || 0,
      dueDate: Number(form.dueDate) || 1, frequency: form.frequency,
      owner: form.owner,
      nextBillingDate: form.nextBillingDate || null,
      paymentMethod: form.paymentMethod || '',
    }
    try {
      if (editSub) { await updateSubscription(editSub.id, data); setEditSub(null) }
      else { await addSubscription(data); setShowAdd(false) }
    } catch (e) {
      alert(`Save failed: ${e.message}`)
    }
  }

  const handleDelete = async (sub) => {
    if (confirm(`Delete "${sub.name}"?`)) await deleteSubscription(sub.id)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>Subscriptions</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Recurring services & memberships</div>
        </div>
        <button className="btn btn-green" onClick={() => { setForm(defaultForm()); setShowAdd(true) }}>
          <Plus size={14} /> Add Subscription
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KPICard label="Annual Cost" value={fmt(metrics.annual)} color="var(--red)" icon={<DollarSign size={16} />} />
        <KPICard label="Monthly Impact" value={fmt(metrics.monthly)} sub="Monthly subs only" />
        <KPICard label="Due This Month" value={`${metrics.dueThisMonth}`} color="var(--amber)" />
        {metrics.nextRenewal && (
          <KPICard
            label="Next Renewal"
            value={metrics.nextRenewal.name}
            sub={`In ${metrics.nextRenewal.days} days · ${fmt(metrics.nextRenewal.amount)}`}
            icon={<Calendar size={16} />}
          />
        )}
        <KPICard label="Total Subs" value={`${activeSubs.length}`} />
      </div>

      {/* Frequency summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        {['Monthly', 'Quarterly', '6 Months', 'Yearly'].map((freq) => {
          const list = activeSubs.filter((s) => s.frequency === freq)
          const total = list.reduce((s, sub) => s + Number(sub.amount || 0), 0)
          return (
            <div
              key={freq}
              className="card"
              onClick={() => setFreqFilter(freqFilter === freq ? 'All' : freq)}
              style={{
                cursor: 'pointer',
                borderColor: freqFilter === freq ? 'var(--green-border)' : 'var(--border)',
                background: freqFilter === freq ? 'var(--green-dim)' : 'var(--surface)',
                transition: 'all 0.15s',
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>{freq}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: freqFilter === freq ? 'var(--green)' : 'var(--text)' }}>{fmt(total)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{list.length} sub{list.length !== 1 ? 's' : ''}</div>
            </div>
          )
        })}
      </div>

      {/* Owner filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {OWNERS.map((o) => (
          <button
            key={o}
            onClick={() => setOwnerFilter(o)}
            style={{
              padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: ownerFilter === o ? 600 : 400,
              border: '1px solid', cursor: 'pointer',
              background: ownerFilter === o ? 'var(--blue-dim)' : 'transparent',
              borderColor: ownerFilter === o ? 'var(--blue-border)' : 'var(--border)',
              color: ownerFilter === o ? 'var(--blue)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {o}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th onClick={() => sort('name')}>Name{sortIcon('name')}</th>
                <th onClick={() => sort('frequency')}>Frequency{sortIcon('frequency')}</th>
                <th>Next Billing</th>
                <th onClick={() => sort('amount')}>Amount{sortIcon('amount')}</th>
                <th>Annual Cost</th>
                <th>Payment Method</th>
                <th onClick={() => sort('owner')}>Owner{sortIcon('owner')}</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{sub.name}</div>
                  </td>
                  <td><Badge variant={sub.frequency?.toLowerCase()} label={sub.frequency} size="sm" /></td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub.nextBillingDate ?? '—'}</span></td>
                  <td><span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmt(sub.amount)}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(annualCost(sub))}/yr</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub.paymentMethod || '—'}</span></td>
                  <td><Badge variant={sub.owner?.toLowerCase()} label={sub.owner} size="sm" /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn-icon btn-sm" onClick={() => openEdit(sub)}><Edit2 size={13} /></button>
                      <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(sub)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 13 }}>No subscriptions match this filter</div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showAdd || !!editSub} onClose={() => { setShowAdd(false); setEditSub(null) }} title={editSub ? 'Edit Subscription' : 'Add Subscription'}>
        <FormRow label="Name"><input className="inp" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Netflix" /></FormRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Amount ($)"><input className="inp" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormRow>
          <FormRow label="Frequency">
            <select className="inp" value={form.frequency || 'Monthly'} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              <option>Monthly</option><option>Quarterly</option><option>6 Months</option><option>Yearly</option>
            </select>
          </FormRow>
          <FormRow label="Next Billing Date">
            <input className="inp" type="date" value={form.nextBillingDate || ''} onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })} />
          </FormRow>
          <FormRow label="Owner">
            <select className="inp" value={form.owner || 'Jorge'} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
              <option>Jorge</option><option>Anseli</option>
            </select>
          </FormRow>
        </div>
        <FormRow label="Payment Method (card or account)">
          <input className="inp" value={form.paymentMethod || ''} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} placeholder="e.g. Chase Sapphire, BOA Checking" />
        </FormRow>
        <ModalFooter>
          <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setEditSub(null) }}>Cancel</button>
          <button className="btn btn-green" onClick={handleSave}>{editSub ? 'Save' : 'Add'}</button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

function defaultForm() { return { name: '', amount: '', dueDate: '', frequency: 'Monthly', owner: 'Jorge', nextBillingDate: '', paymentMethod: '' } }
