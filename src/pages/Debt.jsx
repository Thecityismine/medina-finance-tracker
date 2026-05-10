import { useState, useMemo } from 'react'
import { useFinance } from '../context/FinanceContext'
import KPICard from '../components/ui/KPICard'
import Modal from '../components/ui/Modal'
import { FormRow, ModalFooter } from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { fmt, fmtPct, creditUtilization, payoffOrder } from '../utils/calculations'
import { Plus, Edit2, Trash2, TrendingDown, CreditCard as CardIcon } from 'lucide-react'

export default function Debt() {
  const { creditCards, loans, addCreditCard, updateCreditCard, deleteCreditCard, addLoan, updateLoan, deleteLoan, appSettings, updateSettings } = useFinance()

  const [payoffMethod, setPayoffMethod] = useState(appSettings?.payoffMethod ?? 'avalanche')
  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [editLoan, setEditLoan] = useState(null)
  const [cardForm, setCardForm] = useState(defaultCardForm())
  const [loanForm, setLoanForm] = useState(defaultLoanForm())

  const handlePayoffMethod = (m) => {
    setPayoffMethod(m)
    updateSettings({ payoffMethod: m })
  }

  const metrics = useMemo(() => {
    const ccDebt = creditCards.reduce((s, c) => s + Number(c.balance || 0), 0)
    const loanDebt = loans.reduce((s, l) => s + Number(l.balance || 0), 0)
    const totalDebt = ccDebt + loanDebt
    const jorgeDebt = creditCards.filter((c) => c.ownedBy === 'Jorge').reduce((s, c) => s + Number(c.balance || 0), 0)
    const anseliDebt = creditCards.filter((c) => c.ownedBy === 'Anseli').reduce((s, c) => s + Number(c.balance || 0), 0)
    const utilPct = creditUtilization(creditCards)
    const highestAPR = [...creditCards].sort((a, b) => Number(b.apr) - Number(a.apr))[0]
    const highestBalance = [...creditCards].sort((a, b) => Number(b.balance) - Number(a.balance))[0]
    const totalMin = creditCards.reduce((s, c) => s + Number(c.minPayment ?? c.min_payment ?? 0), 0)
      + loans.reduce((s, l) => s + Number(l.monthlyPayment ?? l.monthly_payment ?? 0), 0)
    const ordered = payoffOrder(creditCards, payoffMethod)
    return { ccDebt, loanDebt, totalDebt, jorgeDebt, anseliDebt, utilPct, highestAPR, highestBalance, totalMin, ordered }
  }, [creditCards, loans, payoffMethod])

  const openEditCard = (c) => {
    setEditCard(c)
    setCardForm({
      name: c.name, balance: c.balance, creditLimit: c.creditLimit ?? c.credit_limit ?? '',
      minPayment: c.minPayment ?? c.min_payment ?? '', apr: c.apr, dueDate: c.dueDate, ownedBy: c.ownedBy,
    })
  }

  const openEditLoan = (l) => {
    setEditLoan(l)
    setLoanForm({
      name: l.name, balance: l.balance,
      monthlyPayment: l.monthlyPayment ?? l.monthly_payment ?? '',
      apr: l.apr, dueDate: l.dueDate,
    })
  }

  const saveCard = async () => {
    const data = { name: cardForm.name, balance: Number(cardForm.balance), creditLimit: Number(cardForm.creditLimit), minPayment: Number(cardForm.minPayment), apr: Number(cardForm.apr), dueDate: Number(cardForm.dueDate), ownedBy: cardForm.ownedBy }
    if (editCard) { await updateCreditCard(editCard.id, data); setEditCard(null) }
    else { await addCreditCard(data); setShowAddCard(false) }
  }

  const saveLoan = async () => {
    const data = { name: loanForm.name, balance: Number(loanForm.balance), monthlyPayment: Number(loanForm.monthlyPayment), apr: Number(loanForm.apr), dueDate: Number(loanForm.dueDate) }
    if (editLoan) { await updateLoan(editLoan.id, data); setEditLoan(null) }
    else { await addLoan(data); setShowAddLoan(false) }
  }

  const deleteCard = async (c) => { if (confirm(`Delete "${c.name}"?`)) await deleteCreditCard(c.id) }
  const deleteLoanItem = async (l) => { if (confirm(`Delete "${l.name}"?`)) await deleteLoan(l.id) }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>Debt</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Credit cards & loans</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setCardForm(defaultCardForm()); setShowAddCard(true) }}>
            <Plus size={14} /> Add Card
          </button>
          <button className="btn btn-ghost" onClick={() => { setLoanForm(defaultLoanForm()); setShowAddLoan(true) }}>
            <Plus size={14} /> Add Loan
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KPICard label="Total Debt" value={fmt(metrics.totalDebt)} color="var(--red)" />
        <KPICard label="Jorge Debt" value={fmt(metrics.jorgeDebt)} color="var(--blue)" />
        <KPICard label="Anseli Debt" value={fmt(metrics.anseliDebt)} color="#a78bfa" />
        <KPICard label="Credit Utilization" value={fmtPct(metrics.utilPct)} color={metrics.utilPct > 70 ? 'var(--red)' : metrics.utilPct > 30 ? 'var(--amber)' : 'var(--green)'} sub={metrics.utilPct > 30 ? '⚠ High' : '✓ OK'} />
        <KPICard label="Highest APR" value={metrics.highestAPR ? `${metrics.highestAPR.apr}%` : '—'} sub={metrics.highestAPR?.name} color="var(--red)" />
        <KPICard label="Highest Balance" value={metrics.highestBalance ? fmt(metrics.highestBalance.balance) : '—'} sub={metrics.highestBalance?.name} />
        <KPICard label="Total Min Payments" value={fmt(metrics.totalMin)} sub="Monthly minimum" />
      </div>

      {/* Payoff Method */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>Payoff Strategy</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 10 }}>
              Recommended Payoff Order
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {metrics.ordered.slice(0, 4).map((c, i) => {
                const limit = Number(c.creditLimit ?? c.credit_limit ?? 0)
                const util = limit > 0 ? Number(c.balance) / limit * 100 : 0
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: i === 0 ? 'var(--green)' : 'var(--surface-3)',
                      color: i === 0 ? '#0a0a0a' : 'var(--text-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.apr}% APR · {fmt(c.balance)}</div>
                    </div>
                    {i === 0 && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>← Pay this first</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Credit Cards */}
      <SectionTitle>Credit Cards</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {[...creditCards]
          .sort((a, b) => {
            const ab = Number(a.balance || 0), bb = Number(b.balance || 0)
            if (ab === 0 && bb === 0) return 0
            if (ab === 0) return 1
            if (bb === 0) return -1
            return bb - ab
          })
          .map((card) => <CardItem key={card.id} card={card} onEdit={openEditCard} onDelete={deleteCard} />)}
        {creditCards.length === 0 && <EmptyState text="No credit cards" />}
      </div>

      {/* Loans */}
      <SectionTitle>Loans</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loans.map((loan) => <LoanItem key={loan.id} loan={loan} onEdit={openEditLoan} onDelete={deleteLoanItem} />)}
        {loans.length === 0 && <EmptyState text="No loans" />}
      </div>

      {/* Add/Edit Card Modal */}
      <Modal open={showAddCard || !!editCard} onClose={() => { setShowAddCard(false); setEditCard(null) }} title={editCard ? 'Edit Card' : 'Add Credit Card'}>
        <FormRow label="Card Name"><input className="inp" value={cardForm.name || ''} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Chase Sapphire" /></FormRow>
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

function CardItem({ card, onEdit, onDelete }) {
  const limit = Number(card.creditLimit ?? card.credit_limit ?? 0)
  const util = limit > 0 ? Number(card.balance) / limit * 100 : 0
  const isHigh = util > 70
  const isMed = util > 30 && util <= 70

  return (
    <div className="card" style={{ borderColor: isHigh ? 'var(--red-border)' : isMed ? 'var(--amber-border)' : 'var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{card.name}</span>
            <Badge variant={card.ownedBy?.toLowerCase()} label={card.ownedBy} size="sm" />
            {isHigh && <Badge variant="overdue" label="High Util" size="sm" />}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>Balance: <strong style={{ color: Number(card.balance) === 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(card.balance)}</strong></span>
            {limit > 0 && <span>Limit: {fmt(limit)}</span>}
            <span>Min: {fmt(card.minPayment ?? card.min_payment)}</span>
            <span>APR: {card.apr}%</span>
            <span>Due: {card.dueDate}th</span>
          </div>
          {limit > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                <span>Utilization</span>
                <span style={{ color: isHigh ? 'var(--red)' : isMed ? 'var(--amber)' : 'var(--green)' }}>{fmtPct(util)}</span>
              </div>
              <div className="prog-track">
                <div className="prog-fill" style={{
                  width: `${Math.min(100, util)}%`,
                  background: isHigh ? 'var(--red)' : isMed ? 'var(--amber)' : 'var(--green)',
                }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{loan.name}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>Balance: <strong style={{ color: 'var(--amber)' }}>{fmt(loan.balance)}</strong></span>
            <span>Payment: {fmt(loan.monthlyPayment ?? loan.monthly_payment)}/mo</span>
            <span>APR: {loan.apr}%</span>
            <span>Due: {loan.dueDate}th</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-icon btn-sm" onClick={() => onEdit(loan)}><Edit2 size={13} /></button>
          <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => onDelete(loan)}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 12 }}>{children}</div>
}
function EmptyState({ text }) {
  return <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-dim)', fontSize: 13 }}>{text}</div>
}
function defaultCardForm() { return { name: '', balance: '', creditLimit: '', minPayment: '', apr: '', dueDate: '', ownedBy: 'Jorge' } }
function defaultLoanForm() { return { name: '', balance: '', monthlyPayment: '', apr: '', dueDate: '' } }
