import { useState, useMemo, useEffect, Fragment } from 'react'
import { useFinance } from '../context/FinanceContext'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormRow, ModalFooter } from '../components/ui/Modal'
import { fmt, daysUntilDue } from '../utils/calculations'
import {
  Plus, Edit2, Trash2, Calendar, DollarSign, Search,
  X, ChevronDown, ChevronRight, SlidersHorizontal,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBSCRIPTION_CATEGORIES = [
  'Software & AI', 'Streaming', 'Insurance', 'Fitness', 'Cloud & Hosting',
  'Domain & Website', 'Security & Privacy', 'Productivity', 'Automotive',
  'Home Services', 'Kids & Gaming', 'Storage & Backup', 'Professional Tools',
  'Utilities', 'Other',
]

const PRICE_RANGES = [
  { label: 'Under $10',   min: 0,   max: 10 },
  { label: '$10 – $25',  min: 10,  max: 25 },
  { label: '$25 – $100', min: 25,  max: 100 },
  { label: 'Over $100',  min: 100, max: Infinity },
]

const RENEWAL_OPTIONS = ['This Month', 'Next 30 Days', 'Next 90 Days', 'This Year', 'Next 12 Months', 'Next 2 Years']
const GROUP_BY_OPTIONS = ['None', 'Category', 'Frequency', 'Payment Method', 'Owner']
const FILTER_KEY = 'subscriptionFilters'

// Quick chips shown in the sticky bar (All is rendered separately)
const QUICK_FILTERS = [
  { label: 'Due Soon',  key: 'renewal',  value: 'Next 30 Days' },
  { label: 'Monthly',   key: 'freq',     value: 'Monthly' },
  { label: 'Yearly',    key: 'freq',     value: 'Yearly' },
  { label: 'AI Tools',  key: 'category', value: 'Software & AI' },
  { label: 'Insurance', key: 'category', value: 'Insurance' },
]

const CATEGORY_COLORS = {
  'Software & AI':      { bg: 'rgba(96,165,250,0.12)',   color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'Streaming':          { bg: 'rgba(251,191,36,0.12)',   color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  'Insurance':          { bg: 'rgba(248,113,113,0.12)',  color: '#f87171', border: 'rgba(248,113,113,0.25)' },
  'Fitness':            { bg: 'rgba(52,211,153,0.12)',   color: '#34d399', border: 'rgba(52,211,153,0.25)' },
  'Cloud & Hosting':    { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  'Domain & Website':   { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  'Security & Privacy': { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  'Productivity':       { bg: 'rgba(99,102,241,0.12)',  color: '#6366f1', border: 'rgba(99,102,241,0.25)' },
  'Automotive':         { bg: 'rgba(234,179,8,0.12)',   color: '#eab308', border: 'rgba(234,179,8,0.25)' },
  'Home Services':      { bg: 'rgba(20,184,166,0.12)',  color: '#14b8a6', border: 'rgba(20,184,166,0.25)' },
  'Kids & Gaming':      { bg: 'rgba(236,72,153,0.12)',  color: '#ec4899', border: 'rgba(236,72,153,0.25)' },
  'Storage & Backup':   { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: 'rgba(148,163,184,0.25)' },
  'Professional Tools': { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c', border: 'rgba(251,146,60,0.25)' },
  'Utilities':          { bg: 'rgba(163,230,53,0.12)',  color: '#a3e635', border: 'rgba(163,230,53,0.25)' },
  'Other':              { bg: 'rgba(100,116,139,0.12)', color: '#64748b', border: 'rgba(100,116,139,0.25)' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function annualCost(sub) {
  const amt = Number(sub.amount || 0)
  switch (sub.frequency) {
    case 'Monthly':   return amt * 12
    case 'Quarterly': return amt * 4
    case '6 Months':  return amt * 2
    case 'Yearly':    return amt
    case '2 Years':   return amt / 2
    case '3 Years':   return amt / 3
    case '5 Years':   return amt / 5
    default:          return amt * 12
  }
}

function formatTimeUntil(days) {
  if (days === 0) return 'Today'
  if (days < 0) return 'Overdue'
  if (days < 60) return `In ${days} day${days !== 1 ? 's' : ''}`
  const months = Math.round(days / 30.44)
  if (months < 24) return `In ${months} month${months !== 1 ? 's' : ''}`
  const years = (days / 365.25).toFixed(1)
  return `In ${years} yr${parseFloat(years) !== 1 ? 's' : ''}`
}

function fmtContractAddr(addr) {
  if (!addr) return null
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function monthlyEquivalent(sub) { return annualCost(sub) / 12 }

// Abbreviated currency: $8,239 → $8.2K
function fmtK(n) {
  const v = n ?? 0
  const abs = Math.abs(v)
  if (abs >= 10000) return `$${Math.round(v / 1000)}K`
  if (abs >= 1000)  return `$${(v / 1000).toFixed(1)}K`
  return fmt(v)
}

function defaultFilters() {
  return { search: '', category: 'All', freq: 'All', payment: 'All', owner: 'All', renewal: 'All', price: 'All' }
}

function loadFilters() {
  try { return { ...defaultFilters(), ...JSON.parse(localStorage.getItem(FILTER_KEY) ?? 'null') } }
  catch { return defaultFilters() }
}

function isFiltersActive(f) {
  const d = defaultFilters()
  return Object.keys(d).some((k) => f[k] !== d[k])
}

function matchesRenewal(sub, renewal) {
  if (renewal === 'All') return true
  const dateStr = sub.nextBillingDate
  if (!dateStr) return false
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (date - now) / (1000 * 60 * 60 * 24)
  if (renewal === 'This Month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  if (renewal === 'Next 30 Days') return diff >= 0 && diff <= 30
  if (renewal === 'Next 90 Days') return diff >= 0 && diff <= 90
  if (renewal === 'This Year') return date.getFullYear() === now.getFullYear()
  if (renewal === 'Next 12 Months') return diff >= 0 && diff <= 365
  if (renewal === 'Next 2 Years') return diff >= 0 && diff <= 730
  return true
}

function CategoryBadge({ category }) {
  const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Other']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 99, fontSize: 10, fontWeight: 600,
      padding: '2px 7px', letterSpacing: '0.03em', whiteSpace: 'nowrap',
    }}>
      {category || 'Other'}
    </span>
  )
}

function defaultForm() {
  return { name: '', amount: '', dueDate: '', frequency: 'Monthly', owner: 'Jorge', category: '', nextBillingDate: '', paymentMethod: '', payPeriod: '', contractAddress: '', purchaseDate: '', notes: '' }
}

const CHIP = {
  base: {
    padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
    border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    transition: 'all 0.15s',
  },
  active: { background: 'var(--green-dim)', borderColor: 'var(--green-border)', color: 'var(--green)', fontWeight: 600 },
  inactive: { background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-muted)' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Subscriptions() {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription, appSettings } = useFinance()
  // Use categories from Firestore settings, falling back to the hardcoded defaults
  const categories = appSettings?.subscriptionCategories?.length > 0
    ? appSettings.subscriptionCategories
    : SUBSCRIPTION_CATEGORIES

  const [filters, setFilters] = useState(loadFilters)
  const [sortKey, setSortKey] = useState('nextBillingDate')
  const [sortDir, setSortDir] = useState('asc')
  const [groupBy, setGroupBy] = useState('None')
  const [collapsed, setCollapsed] = useState({})
  const [showFrequency, setShowFrequency] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editSub, setEditSub] = useState(null)
  const [form, setForm] = useState(defaultForm())

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify(filters))
  }, [filters])

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))
  const clearFilters = () => setFilters(defaultFilters())

  const activeSubs = subscriptions.filter((s) => s.active !== false)

  const paymentMethods = useMemo(() => {
    const set = new Set(activeSubs.map((s) => s.paymentMethod).filter(Boolean))
    return [...Array.from(set).sort()]
  }, [activeSubs])

  // Count of advanced (dropdown) filters active — excludes quick chip keys
  const advancedFilterCount = useMemo(() =>
    ['owner', 'renewal', 'price'].filter((k) => filters[k] !== defaultFilters()[k]).length
  , [filters])

  const filtered = useMemo(() => {
    let list = activeSubs
    const q = filters.search.toLowerCase()
    if (q) list = list.filter((s) =>
      (s.name ?? '').toLowerCase().includes(q) ||
      (s.category ?? '').toLowerCase().includes(q) ||
      (s.paymentMethod ?? '').toLowerCase().includes(q)
    )
    if (filters.category !== 'All') list = list.filter((s) => (s.category || 'Other') === filters.category)
    if (filters.freq !== 'All') list = list.filter((s) => s.frequency === filters.freq)
    if (filters.payment !== 'All') list = list.filter((s) => s.paymentMethod === filters.payment)
    if (filters.owner !== 'All') list = list.filter((s) => s.owner === filters.owner)
    if (filters.renewal !== 'All') list = list.filter((s) => matchesRenewal(s, filters.renewal))
    if (filters.price !== 'All') {
      const range = PRICE_RANGES.find((r) => r.label === filters.price)
      if (range) list = list.filter((s) => Number(s.amount || 0) >= range.min && Number(s.amount || 0) < range.max)
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const dir = sortDir === 'asc' ? 1 : -1
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }, [activeSubs, filters, sortKey, sortDir])

  const metrics = useMemo(() => {
    const annual = filtered.reduce((s, sub) => s + annualCost(sub), 0)
    const monthly = annual / 12
    const now = new Date()
    const dueNext30 = filtered.filter((s) => {
      if (!s.nextBillingDate) return false
      const d = new Date(s.nextBillingDate)
      const diff = (d - now) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 30
    }).length
    const nextRenewal = filtered
      .map((s) => {
        if (s.nextBillingDate) {
          const days = Math.ceil((new Date(s.nextBillingDate) - now) / 86400000)
          return { ...s, days }
        }
        if (s.frequency === 'Monthly') return { ...s, days: daysUntilDue(s.dueDate) }
        return { ...s, days: -1 }
      })
      .filter((s) => s.days >= 0)
      .sort((a, b) => a.days - b.days)[0]
    return { annual, monthly, dueNext30, nextRenewal, count: filtered.length }
  }, [filtered])

  const grouped = useMemo(() => {
    if (groupBy === 'None') return null
    const groups = {}
    const getKey = (sub) => {
      if (groupBy === 'Category') return sub.category || 'Other'
      if (groupBy === 'Frequency') return sub.frequency || 'Unknown'
      if (groupBy === 'Payment Method') return sub.paymentMethod || 'Unknown'
      if (groupBy === 'Owner') return sub.owner || 'Unknown'
      return 'All'
    }
    filtered.forEach((sub) => {
      const k = getKey(sub)
      if (!groups[k]) groups[k] = []
      groups[k].push(sub)
    })
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered, groupBy])

  const sort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }
  const sortIcon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
  const toggleCollapse = (name) => setCollapsed((c) => ({ ...c, [name]: !c[name] }))

  const openEdit = (sub) => {
    setEditSub(sub)
    setForm({
      name: sub.name, amount: sub.amount, dueDate: sub.dueDate,
      frequency: sub.frequency, owner: sub.owner ?? 'Jorge',
      category: sub.category ?? '',
      nextBillingDate: sub.nextBillingDate ?? '',
      paymentMethod: sub.paymentMethod ?? '',
      payPeriod: sub.payPeriod ?? '',
      contractAddress: sub.contractAddress ?? '',
      purchaseDate: sub.purchaseDate ?? '',
      notes: sub.notes ?? '',
    })
  }

  const handleSave = async () => {
    const data = {
      name: form.name, amount: Number(form.amount) || 0,
      dueDate: Number(form.dueDate) || 1, frequency: form.frequency,
      owner: form.owner, category: form.category || 'Other',
      nextBillingDate: form.nextBillingDate || null,
      paymentMethod: form.paymentMethod || '',
      payPeriod: form.payPeriod ? Number(form.payPeriod) : null,
      contractAddress: form.contractAddress || '',
      purchaseDate: form.purchaseDate || '',
      notes: form.notes || '',
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

  // ─── Sub-components ──────────────────────────────────────────────────────────

  const TableHead = () => (
    <thead>
      <tr>
        <th onClick={() => sort('name')}>Name{sortIcon('name')}</th>
        <th onClick={() => sort('category')}>Category{sortIcon('category')}</th>
        <th onClick={() => sort('frequency')}>Frequency{sortIcon('frequency')}</th>
        <th onClick={() => sort('nextBillingDate')}>Next Billing{sortIcon('nextBillingDate')}</th>
        <th onClick={() => sort('amount')}>Amount{sortIcon('amount')}</th>
        <th>Annual Cost</th>
        <th>Payment Method</th>
        <th>Contract</th>
        <th onClick={() => sort('owner')}>Owner{sortIcon('owner')}</th>
        <th style={{ textAlign: 'right' }}>Actions</th>
      </tr>
    </thead>
  )

  const SubRow = ({ sub }) => {
    const now = new Date()
    const billingDays = sub.nextBillingDate
      ? Math.ceil((new Date(sub.nextBillingDate) - now) / 86400000)
      : null
    const isLongTerm = billingDays !== null && billingDays > 120
    return (
      <tr>
        <td><div style={{ fontWeight: 500, color: 'var(--text)' }}>{sub.name}</div></td>
        <td><CategoryBadge category={sub.category} /></td>
        <td><Badge variant={sub.frequency?.toLowerCase()} label={sub.frequency} size="sm" /></td>
        <td>
          {sub.nextBillingDate ? (
            <div>
              <span style={{ fontSize: 12, color: isLongTerm ? 'var(--blue)' : 'var(--text-muted)' }}>{sub.nextBillingDate}</span>
              {isLongTerm && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{formatTimeUntil(billingDays)}</div>
              )}
            </div>
          ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
        </td>
        <td><span style={{ fontWeight: 600 }}>{fmt(sub.amount)}</span></td>
        <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(annualCost(sub))}/yr</span></td>
        <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub.paymentMethod || '—'}</span></td>
        <td>
          {sub.contractAddress ? (
            <span
              title={sub.contractAddress}
              style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace', cursor: 'default' }}
            >
              {fmtContractAddr(sub.contractAddress)}
            </span>
          ) : <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>}
        </td>
        <td><Badge variant={sub.owner?.toLowerCase()} label={sub.owner} size="sm" /></td>
        <td>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <button className="btn-icon btn-sm" onClick={() => openEdit(sub)}><Edit2 size={13} /></button>
            <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(sub)}><Trash2 size={13} /></button>
          </div>
        </td>
      </tr>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const nr = metrics.nextRenewal

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 80 }}>

      {/* ── 1. Header (no Add button) ── */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>Subscriptions</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          {isFiltersActive(filters)
            ? `${filtered.length} of ${activeSubs.length} subscriptions`
            : `${activeSubs.length} recurring services`}
        </div>
      </div>

      {/* ── 2. Search bar ── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
        <input
          className="inp"
          style={{ paddingLeft: 36, fontSize: 14 }}
          placeholder="Search subscriptions…"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
        {filters.search && (
          <button
            onClick={() => setFilter('search', '')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── 3. 4 Core KPI Cards (2×2) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {/* Monthly Equivalent */}
        <KPICard
          label="Monthly Equivalent"
          value={fmtK(metrics.monthly)}
          sub={`${metrics.count} subscription${metrics.count !== 1 ? 's' : ''}`}
        />
        {/* Annual Cost */}
        <KPICard
          label="Annual Cost"
          value={fmtK(metrics.annual)}
          color="var(--red)"
          icon={<DollarSign size={16} />}
        />
        {/* Due in 30 Days */}
        <KPICard
          label="Due in 30 Days"
          value={`${metrics.dueNext30}`}
          color={metrics.dueNext30 > 0 ? 'var(--amber)' : undefined}
          sub={metrics.dueNext30 > 0 ? 'renewals coming up' : 'none upcoming'}
        />
        {/* Next Renewal — custom card for richer detail */}
        <div className="card" style={{ minHeight: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 8 }}>
            Next Renewal
          </div>
          {nr ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px', lineHeight: 1.2, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {nr.name}
              </div>
              <div style={{ fontSize: 12, color: nr.days === 0 ? 'var(--amber)' : 'var(--text-muted)', lineHeight: 1.5 }}>
                {formatTimeUntil(nr.days)} · {fmt(nr.amount)}
              </div>
              {nr.paymentMethod && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{nr.paymentMethod}</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>—</div>
          )}
        </div>
      </div>

      {/* ── 4. Sticky Quick Filter Chips ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', paddingTop: 8, paddingBottom: 8,
        marginBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="chips-scroll" style={{ display: 'flex', gap: 6 }}>
          {/* All — clears all filters */}
          <button
            onClick={clearFilters}
            style={{
              ...CHIP.base,
              ...(!isFiltersActive(filters) ? CHIP.active : CHIP.inactive),
            }}
          >
            All
          </button>

          {/* Quick filter chips */}
          {QUICK_FILTERS.map(({ label, key, value }) => {
            const isActive = filters[key] === value
            return (
              <button
                key={label}
                onClick={() => setFilter(key, isActive ? 'All' : value)}
                style={{ ...CHIP.base, ...(isActive ? CHIP.active : CHIP.inactive) }}
              >
                {label}
              </button>
            )
          })}

          {/* Dynamic payment method chips */}
          {paymentMethods.map((m) => {
            const isActive = filters.payment === m
            return (
              <button
                key={m}
                onClick={() => setFilter('payment', isActive ? 'All' : m)}
                style={{ ...CHIP.base, ...(isActive ? CHIP.active : CHIP.inactive) }}
              >
                {m}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 5. Spending by Billing Frequency (collapsible, default collapsed) ── */}
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <button
          onClick={() => setShowFrequency(!showFrequency)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            background: 'none', border: '1px solid var(--border)', borderRadius: 10,
            padding: '9px 14px', cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: 13, fontWeight: 500, transition: 'border-color 0.15s',
          }}
        >
          {showFrequency ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Spending by Billing Frequency</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)' }}>
            {['Monthly', 'Quarterly', '6 Months', 'Yearly', '2 Years', '3 Years', '5 Years'].map(f =>
              activeSubs.filter(s => s.frequency === f).length
            ).join(' · ')} subs
          </span>
        </button>

        {showFrequency && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 10 }}>
            {['Monthly', 'Quarterly', '6 Months', 'Yearly', '2 Years', '3 Years', '5 Years'].map((freq) => {
              const list = activeSubs.filter((s) => s.frequency === freq)
              const total = list.reduce((s, sub) => s + Number(sub.amount || 0), 0)
              const isActive = filters.freq === freq
              return (
                <div
                  key={freq}
                  className="card"
                  onClick={() => setFilter('freq', isActive ? 'All' : freq)}
                  style={{
                    cursor: 'pointer',
                    borderColor: isActive ? 'var(--green-border)' : 'var(--border)',
                    background: isActive ? 'var(--green-dim)' : 'var(--surface)',
                    transition: 'all 0.15s',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>{freq}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: isActive ? 'var(--green)' : 'var(--text)' }}>{fmtK(total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{list.length} sub{list.length !== 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 6. Advanced Filters (collapsible dropdown row) ── */}
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid var(--border)', borderRadius: 10,
            padding: '9px 14px', cursor: 'pointer',
            color: advancedFilterCount > 0 ? 'var(--green)' : 'var(--text-muted)',
            borderColor: advancedFilterCount > 0 ? 'var(--green-border)' : 'var(--border)',
            fontSize: 13, fontWeight: advancedFilterCount > 0 ? 600 : 400,
            transition: 'all 0.15s',
          }}
        >
          <SlidersHorizontal size={13} />
          <span>More Filters</span>
          {advancedFilterCount > 0 && (
            <span style={{
              background: 'var(--green)', color: '#0a0a0a',
              borderRadius: 99, fontSize: 10, fontWeight: 700,
              padding: '1px 6px', marginLeft: 2,
            }}>
              {advancedFilterCount}
            </span>
          )}
          {showAdvanced ? <ChevronDown size={13} style={{ marginLeft: 'auto' }} /> : <ChevronRight size={13} style={{ marginLeft: 'auto' }} />}
        </button>

        {showAdvanced && (
          <div className="card" style={{ padding: '12px 14px', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="inp" style={{ flex: '0 1 150px', fontSize: 13, padding: '7px 10px' }} value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
                <option value="All">Category</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>

              <select className="inp" style={{ flex: '0 1 130px', fontSize: 13, padding: '7px 10px' }} value={filters.freq} onChange={(e) => setFilter('freq', e.target.value)}>
                <option value="All">Frequency</option>
                {['Monthly', 'Quarterly', '6 Months', 'Yearly', '2 Years', '3 Years', '5 Years'].map((f) => <option key={f}>{f}</option>)}
              </select>

              <select className="inp" style={{ flex: '0 1 110px', fontSize: 13, padding: '7px 10px' }} value={filters.owner} onChange={(e) => setFilter('owner', e.target.value)}>
                <option value="All">Owner</option>
                <option>Jorge</option>
                <option>Anseli</option>
              </select>

              <select className="inp" style={{ flex: '0 1 140px', fontSize: 13, padding: '7px 10px' }} value={filters.renewal} onChange={(e) => setFilter('renewal', e.target.value)}>
                <option value="All">Renewal</option>
                {RENEWAL_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>

              <select className="inp" style={{ flex: '0 1 130px', fontSize: 13, padding: '7px 10px' }} value={filters.price} onChange={(e) => setFilter('price', e.target.value)}>
                <option value="All">Price Range</option>
                {PRICE_RANGES.map((r) => <option key={r.label}>{r.label}</option>)}
              </select>

              {isFiltersActive(filters) && (
                <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ gap: 4 }}>
                  <X size={12} /> Clear All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Group By + result count ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Group by:</span>
        {GROUP_BY_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setGroupBy(opt)}
            style={{
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: groupBy === opt ? 600 : 400,
              border: '1px solid', cursor: 'pointer',
              background: groupBy === opt ? 'var(--blue-dim)' : 'transparent',
              borderColor: groupBy === opt ? 'var(--blue-border)' : 'var(--border)',
              color: groupBy === opt ? 'var(--blue)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {opt}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {isFiltersActive(filters) && <span style={{ color: 'var(--green)', marginLeft: 6, fontWeight: 600 }}>· filtered</span>}
        </span>
      </div>

      {/* ── 8. Subscription Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <TableHead />
            <tbody>
              {grouped ? (
                grouped.map(([groupName, subs]) => {
                  const isCollapsed = collapsed[groupName]
                  const groupMonthly = subs.reduce((s, sub) => s + monthlyEquivalent(sub), 0)
                  const groupAnnual = subs.reduce((s, sub) => s + annualCost(sub), 0)
                  return (
                    <Fragment key={groupName}>
                      <tr
                        onClick={() => toggleCollapse(groupName)}
                        style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.025)' }}
                      >
                        <td colSpan={10} style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isCollapsed
                              ? <ChevronRight size={14} color="var(--text-dim)" />
                              : <ChevronDown size={14} color="var(--text-dim)" />}
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{groupName}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>({subs.length})</span>
                            <span style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtK(groupAnnual)}/yr</span>
                              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{fmt(groupMonthly)}/mo</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                      {!isCollapsed && subs.map((sub) => <SubRow key={sub.id} sub={sub} />)}
                    </Fragment>
                  )
                })
              ) : (
                filtered.map((sub) => <SubRow key={sub.id} sub={sub} />)
              )}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-dim)', fontSize: 13 }}>
              No subscriptions match the current filters
              {isFiltersActive(filters) && (
                <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ marginLeft: 12 }}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 9. Floating Action Button ── */}
      <button
        onClick={() => { setForm(defaultForm()); setShowAdd(true) }}
        title="Add Subscription"
        style={{
          position: 'fixed', bottom: 80, right: 20,
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--green)', color: '#0a0a0a',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(52,211,153,0.45)',
          zIndex: 50,
          transition: 'transform 0.15s, box-shadow 0.15s',
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

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={showAdd || !!editSub}
        onClose={() => { setShowAdd(false); setEditSub(null) }}
        title={editSub ? 'Edit Subscription' : 'Add Subscription'}
      >
        <FormRow label="Name">
          <input className="inp" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Netflix" />
        </FormRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Amount ($)">
            <input className="inp" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </FormRow>
          <FormRow label="Frequency">
            <select className="inp" value={form.frequency || 'Monthly'} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              <option>Monthly</option><option>Quarterly</option><option>6 Months</option><option>Yearly</option>
              <option>2 Years</option><option>3 Years</option><option>5 Years</option>
            </select>
          </FormRow>
          <FormRow label="Category">
            <select className="inp" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </FormRow>
          <FormRow label="Owner">
            <select className="inp" value={form.owner || 'Jorge'} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
              <option>Jorge</option><option>Anseli</option>
            </select>
          </FormRow>
          <FormRow label="Next Billing Date">
            <input className="inp" type="date" value={form.nextBillingDate || ''} onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })} />
          </FormRow>
          <FormRow label="Pay Period">
            <select className="inp" value={form.payPeriod ?? ''} onChange={(e) => setForm({ ...form, payPeriod: e.target.value })}>
              <option value="">Auto (by billing date)</option>
              <option value="1">Period 1 · 1st – 14th</option>
              <option value="2">Period 2 · 15th – 31st</option>
            </select>
          </FormRow>
          <FormRow label="Purchase Date">
            <input className="inp" type="date" value={form.purchaseDate || ''} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </FormRow>
        </div>
        <FormRow label="Payment Method">
          <input className="inp" value={form.paymentMethod || ''} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} placeholder="e.g. BOA Visa, AMEX, BOA Checking" />
        </FormRow>
        <FormRow label="Contract Address">
          <input className="inp" value={form.contractAddress || ''} onChange={(e) => setForm({ ...form, contractAddress: e.target.value })} placeholder="0x… or contract identifier" style={{ fontFamily: 'monospace', fontSize: 13 }} />
        </FormRow>
        <FormRow label="Notes">
          <textarea
            className="inp"
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional details…"
            rows={3}
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
        </FormRow>
        <ModalFooter>
          <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setEditSub(null) }}>Cancel</button>
          <button className="btn btn-green" onClick={handleSave}>{editSub ? 'Save' : 'Add'}</button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
