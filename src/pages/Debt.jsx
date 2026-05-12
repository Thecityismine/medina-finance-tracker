import { useState, useMemo } from 'react'
import { useFinance } from '../context/FinanceContext'
import KPICard from '../components/ui/KPICard'
import Modal from '../components/ui/Modal'
import { FormRow, ModalFooter } from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { fmt, fmtPct, creditUtilization, payoffOrder } from '../utils/calculations'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Flame, Flag } from 'lucide-react'

export default function Debt() {
  const { creditCards, loans, addCreditCard, updateCreditCard, deleteCreditCard, addLoan, updateLoan, deleteLoan, appSettings, updateSettings } = useFinance()

  const [payoffMethod, setPayoffMethod] = useState(appSettings?.payoffMethod ?? 'avalanche')
  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [editLoan, setEditLoan] = useState(null)
  const [cardForm, setCardForm] = useState(defaultCardForm())
  const [loanForm, setLoanForm] = useState(defaultLoanForm())
  const [showZeroBalance, setShowZeroBalance] = useState(false)

  const handlePayoffMethod = (m) => {
    setPayoffMethod(m)
    updateSettings({ payoffMethod: m })
  }

  const metrics = useMemo(() => {
    const ccDebt = creditCards.reduce((s, c) => s + Number(c.balance || 0), 0)
    const loanDebt = loans.reduce((s, l) => s + Number(l.balance || 0), 0)
    const totalDebt = ccDebt + loanDebt
    const totalLimit = creditCards.reduce((s, c) => s + Number(c.creditLimit ?? c.credit_limit ?? 0), 0)
    const availableCredit = totalLimit - ccDebt
    const jorgeDebt = creditCards.filter((c) => (c.ownedBy ?? c.owned_by) === 'Jorge').reduce((s, c) => s + Number(c.balance || 0), 0)
    const anseliDebt = creditCards.filter((c) => (c.ownedBy ?? c.owned_by) === 'Anseli').reduce((s, c) => s + Number(c.balance || 0), 0)
    const utilPct = creditUtilization(creditCards)
    const highestAPR = [...creditCards].filter((c) => Number(c.apr) > 0).sort((a, b) => Number(b.apr) - Number(a.apr))[0]
    const highestBalance = [...creditCards].sort((a, b) => Number(b.balance) - Number(a.balance))[0]
    const totalMin = creditCards.reduce((s, c) => s + Number(c.minPayment ?? c.min_payment ?? 0), 0)
      + loans.reduce((s, l) => s + Number(l.monthlyPayment ?? l.monthly_payment ?? 0), 0)
    const ordered = payoffOrder(creditCards, payoffMethod)

    const monthlyInterest = [
      ...creditCards.map((c) => Number(c.balance || 0) * Number(c.apr || 0) / 100 / 12),
      ...loans.map((l) => Number(l.balance || 0) * Number(l.apr || 0) / 100 / 12),
    ].reduce((s, v) => s + v, 0)

    // Debt-free projection (simplified straight-line, ignoring compounding)
    const minOnlyMonths = totalMin > 0 ? Math.ceil(totalDebt / totalMin) : null
    const withExtraMonths = totalMin > 0 ? Math.ceil(totalDebt / (totalMin + 1500)) : null

    return {
      ccDebt, loanDebt, totalDebt, jorgeDebt, anseliDebt, utilPct,
      highestAPR, highestBalance, totalMin, ordered, monthlyInterest,
      minOnlyMonths, withExtraMonths, totalLimit, availableCredit,
    }
  }, [creditCards, loans, payoffMethod])

  const openEditCard = (c) => {
    setEditCard(c)
    setCardForm({
      name: c.name ?? '',
      balance: c.balance ?? '',
      creditLimit: c.creditLimit ?? c.credit_limit ?? '',
      minPayment: c.minPayment ?? c.min_payment ?? '',
      apr: c.apr ?? '',
      dueDate: c.dueDate ?? c.due_date ?? '',
      ownedBy: c.ownedBy ?? c.owned_by ?? 'Jorge',
      accountNumber: (c.accountNumber ?? '').replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 '),
    })
  }

  const openEditLoan = (l) => {
    setEditLoan(l)
    setLoanForm({
      name: l.name ?? '',
      balance: l.balance ?? '',
      monthlyPayment: l.monthlyPayment ?? l.monthly_payment ?? '',
      apr: l.apr ?? '',
      dueDate: l.dueDate ?? '',
    })
  }

  const saveCard = async () => {
    const data = {
      name: cardForm.name,
      balance: Number(cardForm.balance) || 0,
      creditLimit: Number(cardForm.creditLimit) || 0,
      minPayment: Number(cardForm.minPayment) || 0,
      apr: Number(cardForm.apr) || 0,
      dueDate: Number(cardForm.dueDate) || 0,
      ownedBy: cardForm.ownedBy,
      accountNumber: cardForm.accountNumber || '',
    }
    try {
      if (editCard) { await updateCreditCard(editCard.id, data); setEditCard(null) }
      else { await addCreditCard(data); setShowAddCard(false) }
    } catch (e) {
      alert(`Save failed: ${e.message}`)
    }
  }

  const saveLoan = async () => {
    const data = {
      name: loanForm.name,
      balance: Number(loanForm.balance) || 0,
      monthlyPayment: Number(loanForm.monthlyPayment) || 0,
      apr: Number(loanForm.apr) || 0,
      dueDate: Number(loanForm.dueDate) || 0,
    }
    try {
      if (editLoan) { await updateLoan(editLoan.id, data); setEditLoan(null) }
      else { await addLoan(data); setShowAddLoan(false) }
    } catch (e) {
      alert(`Save failed: ${e.message}`)
    }
  }

  const deleteCard = async (c) => { if (confirm(`Delete "${c.name}"?`)) await deleteCreditCard(c.id) }
  const deleteLoanItem = async (l) => { if (confirm(`Delete "${l.name}"?`)) await deleteLoan(l.id) }

  const sortedCards = [...creditCards].sort((a, b) => {
    const ab = Number(a.balance || 0), bb = Number(b.balance || 0)
    if (ab === 0 && bb === 0) return 0
    if (ab === 0) return 1
    if (bb === 0) return -1
    return bb - ab
  })
  const activeCards = sortedCards.filter((c) => Number(c.balance || 0) > 0)
  const zeroCards = sortedCards.filter((c) => Number(c.balance || 0) === 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>Debt</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Credit cards & loans</div>
      </div>

      {/* ── 1. HERO SUMMARY ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--red-border)', background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          {/* Left: big number */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 6 }}>
              Total Household Debt
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, color: 'var(--red)', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {fmt(metrics.totalDebt)}
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
              <HeroStat label="Min Payments" value={fmt(metrics.totalMin)} sub="/month" />
              <HeroStat
                label="Credit Utilization"
                value={fmtPct(metrics.utilPct)}
                sub={metrics.utilPct > 70 ? '⚠ Critical' : metrics.utilPct > 30 ? '⚠ High' : '✓ Healthy'}
                color={metrics.utilPct > 70 ? 'var(--red)' : metrics.utilPct > 30 ? 'var(--amber)' : 'var(--green)'}
              />
              {metrics.totalLimit > 0 && (
                <HeroStat label="Total Credit Limit" value={fmt(metrics.totalLimit)} sub="across all cards" />
              )}
              {metrics.totalLimit > 0 && (
                <HeroStat label="Available Credit" value={fmt(metrics.availableCredit)} sub="remaining to spend" color="var(--green)" />
              )}
              {metrics.highestAPR && (
                <HeroStat label="Highest APR" value={`${metrics.highestAPR.apr}%`} sub={metrics.highestAPR.name} color="var(--red)" />
              )}
              {metrics.monthlyInterest > 0 && (
                <HeroStat label="Est. Monthly Interest" value={fmt(metrics.monthlyInterest)} sub={`${fmt(metrics.monthlyInterest * 12)}/yr`} color="var(--amber)" />
              )}
            </div>
          </div>
          {/* Right: Jorge / Anseli split */}
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center', padding: '12px 20px', background: 'var(--blue-dim)', border: '1px solid var(--blue-border)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--blue)', marginBottom: 4 }}>Jorge</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>{fmt(metrics.jorgeDebt)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 20px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a78bfa', marginBottom: 4 }}>Anseli</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa' }}>{fmt(metrics.anseliDebt)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PAYOFF STRATEGY ──────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: metrics.ordered.length > 0 ? 16 : 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>Payoff Strategy</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {payoffMethod === 'avalanche'
                ? 'Avalanche: Pay highest APR first — saves the most money in interest'
                : 'Snowball: Pay lowest balance first — builds momentum and motivation'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, background: 'var(--surface-2)', borderRadius: 10, padding: 3 }}>
            {['avalanche', 'snowball'].map((m) => (
              <button
                key={m}
                onClick={() => handlePayoffMethod(m)}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  background: payoffMethod === m ? 'var(--green)' : 'transparent',
                  color: payoffMethod === m ? '#0a0a0a' : 'var(--text-muted)',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {metrics.ordered.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 10 }}>
              Recommended Payoff Order
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {metrics.ordered.slice(0, 5).map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? 'var(--green)' : 'var(--surface-3)',
                    color: i === 0 ? '#0a0a0a' : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>
                      {c.apr}% APR · {fmt(c.balance)} balance · Min {fmt(c.minPayment ?? c.min_payment)}
                    </div>
                  </div>
                  {i === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>← Pay this first</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 3. COMPACT KPI GRID ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
        <KPICard label="Highest Balance" value={metrics.highestBalance ? fmt(metrics.highestBalance.balance) : '—'} sub={metrics.highestBalance?.name} />
        <KPICard label="CC Debt" value={fmt(metrics.ccDebt)} sub={`${creditCards.length} cards`} color="var(--red)" />
        <KPICard label="Loan Debt" value={fmt(metrics.loanDebt)} sub={`${loans.length} loans`} color="var(--amber)" />
      </div>

      {/* ── 4. PROJECTIONS ──────────────────────────────── */}
      {metrics.totalDebt > 0 && metrics.totalMin > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 20 }}>
          {/* Interest Cost */}
          {metrics.monthlyInterest > 0 && (
            <div className="card" style={{ borderColor: 'var(--amber-border)', background: 'var(--amber-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Flame size={16} color="var(--amber)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Interest Cost</span>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--amber)', opacity: 0.8 }}>Per Month</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>{fmt(metrics.monthlyInterest)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--amber)', opacity: 0.8 }}>Per Year</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>{fmt(metrics.monthlyInterest * 12)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--amber)', opacity: 0.8 }}>Per Day</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>{fmt(metrics.monthlyInterest / 30)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Debt-Free Projection */}
          {metrics.minOnlyMonths && (
            <div className="card" style={{ borderColor: 'var(--green-border)', background: 'var(--green-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Flag size={16} color="var(--green)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Debt-Free Projection</span>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--green)', opacity: 0.8 }}>Min Payments Only</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>
                    {metrics.minOnlyMonths > 12 ? `${(metrics.minOnlyMonths / 12).toFixed(1)} yrs` : `${metrics.minOnlyMonths} mo`}
                  </div>
                </div>
                {metrics.withExtraMonths && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--green)', opacity: 0.8 }}>+$1,500/month extra</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>
                      {metrics.withExtraMonths > 12 ? `${(metrics.withExtraMonths / 12).toFixed(1)} yrs` : `${metrics.withExtraMonths} mo`}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--green)', opacity: 0.7, marginTop: 8 }}>
                Simplified estimate · does not account for compounding interest
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. CREDIT CARDS ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
          Credit Cards <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({activeCards.length} active)</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setCardForm(defaultCardForm()); setShowAddCard(true) }}>
          <Plus size={13} /> Add Card
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {activeCards.map((card) => <CardItem key={card.id} card={card} onEdit={openEditCard} onDelete={deleteCard} />)}
        {activeCards.length === 0 && <EmptyState text="No cards with a balance" />}
      </div>

      {/* Zero-balance toggle */}
      {zeroCards.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowZeroBalance(!showZeroBalance)}
            style={{ width: '100%', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 12 }}
          >
            {showZeroBalance ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showZeroBalance ? 'Hide' : 'Show'} zero-balance cards ({zeroCards.length})
          </button>
          {showZeroBalance && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {zeroCards.map((card) => <CardItem key={card.id} card={card} onEdit={openEditCard} onDelete={deleteCard} />)}
            </div>
          )}
        </div>
      )}

      {/* ── 6. LOANS ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
          Loans
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setLoanForm(defaultLoanForm()); setShowAddLoan(true) }}>
          <Plus size={13} /> Add Loan
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {loans.map((loan) => <LoanItem key={loan.id} loan={loan} onEdit={openEditLoan} onDelete={deleteLoanItem} />)}
        {loans.length === 0 && <EmptyState text="No loans" />}
      </div>

      {/* Add/Edit Card Modal */}
      <Modal open={showAddCard || !!editCard} onClose={() => { setShowAddCard(false); setEditCard(null) }} title={editCard ? 'Edit Card' : 'Add Credit Card'}>
        <FormRow label="Card Name"><input className="inp" value={cardForm.name || ''} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Chase Sapphire" /></FormRow>
        <FormRow label="Account Number"><input className="inp" value={cardForm.accountNumber || ''} onChange={(e) => { const raw = e.target.value.replace(/\s/g, ''); const formatted = raw.replace(/(.{4})(?=.)/g, '$1 '); setCardForm({ ...cardForm, accountNumber: formatted }) }} placeholder="e.g. 4400 6663 7424 7522" maxLength={24} /></FormRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Balance ($)"><input className="inp" type="number" value={cardForm.balance || ''} onChange={(e) => setCardForm({ ...cardForm, balance: e.target.value })} /></FormRow>
          <FormRow label="Credit Limit ($)"><input className="inp" type="number" value={cardForm.creditLimit || ''} onChange={(e) => setCardForm({ ...cardForm, creditLimit: e.target.value })} /></FormRow>
          <FormRow label="Min Payment ($)"><input className="inp" type="number" value={cardForm.minPayment || ''} onChange={(e) => setCardForm({ ...cardForm, minPayment: e.target.value })} /></FormRow>
          <FormRow label="APR (%)"><input className="inp" type="number" value={cardForm.apr || ''} onChange={(e) => setCardForm({ ...cardForm, apr: e.target.value })} /></FormRow>
          <FormRow label="Due Date"><input className="inp" type="number" min="1" max="31" value={cardForm.dueDate || ''} onChange={(e) => setCardForm({ ...cardForm, dueDate: e.target.value })} /></FormRow>
          <FormRow label="Owner">
            <select className="inp" value={cardForm.ownedBy || 'Jorge'} onChange={(e) => setCardForm({ ...cardForm, ownedBy: e.target.value })}>
              <option>Jorge</option><option>Anseli</option>
            </select>
          </FormRow>
        </div>
        <ModalFooter>
          <button className="btn btn-ghost" onClick={() => { setShowAddCard(false); setEditCard(null) }}>Cancel</button>
          <button className="btn btn-green" onClick={saveCard}>{editCard ? 'Save' : 'Add Card'}</button>
        </ModalFooter>
      </Modal>

      {/* Add/Edit Loan Modal */}
      <Modal open={showAddLoan || !!editLoan} onClose={() => { setShowAddLoan(false); setEditLoan(null) }} title={editLoan ? 'Edit Loan' : 'Add Loan'}>
        <FormRow label="Loan Name"><input className="inp" value={loanForm.name || ''} onChange={(e) => setLoanForm({ ...loanForm, name: e.target.value })} placeholder="Auto Loan" /></FormRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Balance ($)"><input className="inp" type="number" value={loanForm.balance || ''} onChange={(e) => setLoanForm({ ...loanForm, balance: e.target.value })} /></FormRow>
          <FormRow label="Monthly Payment ($)"><input className="inp" type="number" value={loanForm.monthlyPayment || ''} onChange={(e) => setLoanForm({ ...loanForm, monthlyPayment: e.target.value })} /></FormRow>
          <FormRow label="APR (%)"><input className="inp" type="number" value={loanForm.apr || ''} onChange={(e) => setLoanForm({ ...loanForm, apr: e.target.value })} /></FormRow>
          <FormRow label="Due Date"><input className="inp" type="number" min="1" max="31" value={loanForm.dueDate || ''} onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })} /></FormRow>
        </div>
        <ModalFooter>
          <button className="btn btn-ghost" onClick={() => { setShowAddLoan(false); setEditLoan(null) }}>Cancel</button>
          <button className="btn btn-green" onClick={saveLoan}>{editLoan ? 'Save' : 'Add Loan'}</button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HeroStat({ label, value, sub, color = 'var(--text)' }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function CardItem({ card, onEdit, onDelete }) {
  const limit = Number(card.creditLimit ?? card.credit_limit ?? 0)
  const balance = Number(card.balance || 0)
  const util = limit > 0 ? balance / limit * 100 : 0
  const isHigh = util > 70
  const isMed = util > 30 && util <= 70
  const isPaidOff = balance === 0

  return (
    <div className="card" style={{ borderColor: isHigh ? 'var(--red-border)' : isMed ? 'var(--amber-border)' : 'var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{card.name}</span>
            <Badge variant={(card.ownedBy ?? card.owned_by)?.toLowerCase()} label={card.ownedBy ?? card.owned_by} size="sm" />
            {isHigh && <Badge variant="overdue" label="High Util" size="sm" />}
          </div>

          {/* Row 2: balance / limit + utilization % */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: isPaidOff ? 'var(--green)' : 'var(--text)', letterSpacing: '-0.5px' }}>
              {fmt(balance)}
            </span>
            {limit > 0 && (
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/ {fmt(limit)}</span>
            )}
            {limit > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: isHigh ? 'var(--red)' : isMed ? 'var(--amber)' : 'var(--green)', marginLeft: 'auto' }}>
                {fmtPct(util)}
              </span>
            )}
          </div>

          {/* Row 3: utilization bar */}
          {limit > 0 && (
            <div className="prog-track" style={{ marginBottom: 8 }}>
              <div className="prog-fill" style={{
                width: `${Math.min(100, util)}%`,
                background: isHigh ? 'var(--red)' : isMed ? 'var(--amber)' : 'var(--green)',
              }} />
            </div>
          )}

          {/* Row 4: meta */}
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Min {fmt(card.minPayment ?? card.min_payment)} · APR {card.apr ?? 0}% · Due {card.dueDate ?? card.due_date ?? '—'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button className="btn-icon btn-sm" onClick={() => onEdit(card)}><Edit2 size={13} /></button>
          <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => onDelete(card)}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

function LoanItem({ loan, onEdit, onDelete }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{loan.name}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)', letterSpacing: '-0.5px' }}>{fmt(loan.balance)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Payment {fmt(loan.monthlyPayment ?? loan.monthly_payment)}/mo · APR {loan.apr}% · Due {loan.dueDate ?? '—'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="btn-icon btn-sm" onClick={() => onEdit(loan)}><Edit2 size={13} /></button>
          <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => onDelete(loan)}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ text }) {
  return <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-dim)', fontSize: 13 }}>{text}</div>
}
function defaultCardForm() { return { name: '', balance: '', creditLimit: '', minPayment: '', apr: '', dueDate: '', ownedBy: 'Jorge', accountNumber: '' } }
function defaultLoanForm() { return { name: '', balance: '', monthlyPayment: '', apr: '', dueDate: '' } }
