import { useMemo } from 'react'
import { useFinance } from '../context/FinanceContext'
import KPICard from '../components/ui/KPICard'
import CashFlowChart from '../components/charts/CashFlowChart'
import CategoryChart from '../components/charts/CategoryChart'
import DebtChart from '../components/charts/DebtChart'
import {
  fmt, fmtPct, sumBills, billsForPeriod, incomeForPeriod,
  creditUtilization, nextPaycheck, today,
  daysUntilDue,
} from '../utils/calculations'
import {
  DollarSign, TrendingDown, CreditCard, Calendar,
  AlertTriangle, CheckCircle2, Zap,
} from 'lucide-react'
import { format } from 'date-fns'

export default function Dashboard() {
  const { bills, creditCards, loans, subscriptions, incomeSources, monthlyChecks, loading } = useFinance()
  const { year, month } = today()
  const checksKey = `${year}-${month}`
  const checks = monthlyChecks[checksKey] ?? {}

  const metrics = useMemo(() => {
    const monthlyIncome = incomeSources.reduce((s, src) => s + Number(src.amount) * 2, 0)

    const allBills = bills.filter((b) => b.active !== false)
    const totalBills = sumBills(allBills)
    const leftover = monthlyIncome - totalBills

    const ccDebt = creditCards.reduce((s, c) => s + Number(c.balance || 0), 0)
    const loanDebt = loans.reduce((s, l) => s + Number(l.balance || 0), 0)
    const totalDebt = ccDebt + loanDebt

    const utilPct = creditUtilization(creditCards)

    const monthlySubs = subscriptions
      .filter((s) => s.frequency === 'Monthly')
      .reduce((acc, s) => acc + Number(s.amount || 0), 0)
    const annualSubs = subscriptions
      .reduce((acc, s) => {
        if (s.frequency === 'Monthly') return acc + Number(s.amount) * 12
        if (s.frequency === 'Quarterly') return acc + Number(s.amount) * 4
        if (s.frequency === '6 Months') return acc + Number(s.amount) * 2
        return acc + Number(s.amount || 0)
      }, 0)

    const nextCheck = nextPaycheck(incomeSources)

    // Period data
    const p1Bills = billsForPeriod(allBills, 1)
    const p2Bills = billsForPeriod(allBills, 2)
    const p1Income = incomeForPeriod(incomeSources, year, month, 1)
    const p2Income = incomeForPeriod(incomeSources, year, month, 2)
    const p1Total = sumBills(p1Bills)
    const p2Total = sumBills(p2Bills)
    const p1Paid = sumBills(p1Bills.filter((b) => checks[b.id]))
    const p2Paid = sumBills(p2Bills.filter((b) => checks[b.id]))
    const p1Unpaid = p1Total - p1Paid
    const p2Unpaid = p2Total - p2Paid

    // Smart alerts
    const alerts = []
    if (utilPct > 70) alerts.push({ type: 'danger', text: `Credit utilization at ${Math.round(utilPct)}% — critically high` })
    else if (utilPct > 30) alerts.push({ type: 'warning', text: `Credit utilization at ${Math.round(utilPct)}% — aim for under 30%` })

    if (leftover < 500) alerts.push({ type: 'warning', text: `Only ${fmt(leftover)} left after all bills this month` })

    const dueSoon = allBills.filter((b) => {
      const d = daysUntilDue(b.dueDate ?? b.due_date)
      return d >= 0 && d <= 7 && !checks[b.id]
    })
    if (dueSoon.length > 0)
      alerts.push({ type: 'info', text: `${dueSoon.length} bill${dueSoon.length > 1 ? 's' : ''} due in the next 7 days` })

    const highUtilCards = creditCards.filter((c) => {
      const limit = Number(c.creditLimit ?? c.credit_limit ?? 0)
      return limit > 0 && Number(c.balance) / limit > 0.3
    })
    if (highUtilCards.length > 0)
      alerts.push({ type: 'warning', text: `${highUtilCards.length} card${highUtilCards.length > 1 ? 's' : ''} over 30% utilization` })

    // Cash flow chart data (3 months mock: prev, current, next)
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const cashFlowData = [
      { name: monthNames[(month - 2 + 12) % 12], Income: monthlyIncome, Bills: totalBills, Leftover: monthlyIncome - totalBills },
      { name: monthNames[month - 1], Income: monthlyIncome, Bills: totalBills, Leftover: leftover },
    ]

    return {
      monthlyIncome, totalBills, leftover, totalDebt, utilPct,
      monthlySubs, annualSubs, nextCheck,
      p1Bills, p2Bills, p1Income, p2Income,
      p1Total, p2Total, p1Paid, p2Paid, p1Unpaid, p2Unpaid,
      alerts, cashFlowData, allBills,
    }
  }, [bills, creditCards, loans, subscriptions, incomeSources, checks, year, month])

  if (loading) return <LoadingState />

  const {
    monthlyIncome, totalBills, leftover, totalDebt, utilPct,
    monthlySubs, annualSubs, nextCheck,
    p1Bills, p2Bills, p1Income, p2Income,
    p1Total, p2Total, p1Paid, p2Paid, p1Unpaid, p2Unpaid,
    alerts, cashFlowData, allBills,
  } = metrics

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((a, i) => (
            <AlertBanner key={i} type={a.type} text={a.text} />
          ))}
        </div>
      )}

      {/* ── Financial Command Center ── */}
      <style>{`
        .dash-primary   { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .dash-secondary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        @media (max-width: 900px) {
          .dash-primary   { grid-template-columns: 1fr; }
          .dash-secondary { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .dash-secondary { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Row 1 — Primary */}
      <div className="dash-primary">
        <LeftoverHeroCard leftover={leftover} monthlyIncome={monthlyIncome} totalBills={totalBills} />
        <IncomeCard monthlyIncome={monthlyIncome} sources={incomeSources} pctCommitted={monthlyIncome > 0 ? totalBills / monthlyIncome * 100 : 0} />
        <BillsCard totalBills={totalBills} paidAmt={p1Paid + p2Paid} allBills={allBills} checks={checks} />
      </div>

      {/* Row 2 — Secondary */}
      <div className="dash-secondary">
        <KPICard
          label="Total Debt"
          value={fmt(totalDebt)}
          sub={`${creditCards.length} card${creditCards.length !== 1 ? 's' : ''} · ${loans.length} loan${loans.length !== 1 ? 's' : ''}`}
          color="var(--red)"
          icon={<TrendingDown size={16} />}
        />
        <KPICard
          label="Credit Utilization"
          value={fmtPct(utilPct)}
          sub={utilPct > 70 ? '↓ Critical — pay down now' : utilPct > 30 ? '↓ Aim below 30%' : '↑ Healthy range'}
          color={utilPct > 70 ? 'var(--red)' : utilPct > 30 ? 'var(--amber)' : 'var(--green)'}
          icon={<CreditCard size={16} />}
        />
        <KPICard
          label="Next Paycheck"
          value={nextCheck ? fmt(nextCheck.amount) : '—'}
          sub={nextCheck ? `${nextCheck.person} · ${format(nextCheck.date, 'MMM d')}` : 'No income sources'}
          color={nextCheck ? 'var(--green)' : 'var(--text-dim)'}
          icon={<Calendar size={16} />}
        />
        <KPICard
          label="Monthly Subs"
          value={fmt(monthlySubs)}
          sub={`${fmt(annualSubs)}/yr · ${subscriptions.length} active`}
          icon={<Zap size={16} />}
        />
      </div>

      {/* Cash Flow Periods */}
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Cash Flow by Period</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <PeriodCard
            label="1st – 15th"
            income={p1Income}
            total={p1Total}
            paid={p1Paid}
            unpaid={p1Unpaid}
            bills={p1Bills}
            checks={checks}
          />
          <PeriodCard
            label="16th – 31st"
            income={p2Income}
            total={p2Total}
            paid={p2Paid}
            unpaid={p2Unpaid}
            bills={p2Bills}
            checks={checks}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <SectionTitle small>Monthly Cash Flow</SectionTitle>
          <CashFlowChart data={cashFlowData} />
        </div>
        <div className="card">
          <SectionTitle small>Spending by Category</SectionTitle>
          <CategoryChart bills={allBills} />
        </div>
        <div className="card">
          <SectionTitle small>Debt by Card</SectionTitle>
          <DebtChart creditCards={creditCards} />
        </div>
      </div>

      {/* Upcoming bills this week */}
      <UpcomingBills bills={allBills} checks={checks} />
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PeriodCard({ label, income, total, paid, unpaid, bills, checks }) {
  const leftover = income - total
  const paidCount = bills.filter((b) => checks[b.id]).length
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0

  return (
    <div className="card">
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <MiniStat label="Income" value={fmt(income)} color="var(--green)" />
        <MiniStat label="Bills Due" value={fmt(total)} />
        <MiniStat label="Paid" value={fmt(paid)} color="var(--green)" />
        <MiniStat label="Unpaid" value={fmt(unpaid)} color={unpaid > 0 ? 'var(--amber)' : 'var(--text-dim)'} />
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 5 }}>
          <span>Paid {paidCount}/{bills.length}</span>
          <span style={{ color: leftover >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {leftover >= 0 ? '+' : ''}{fmt(leftover)} leftover
          </span>
        </div>
        <div className="prog-track">
          <div className="prog-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : 'var(--blue)' }} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color = 'var(--text)' }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function UpcomingBills({ bills, checks }) {
  const upcoming = bills
    .map((b) => ({ ...b, days: daysUntilDue(b.dueDate ?? b.due_date) }))
    .filter((b) => b.days >= 0 && b.days <= 14 && !checks[b.id])
    .sort((a, b) => a.days - b.days)
    .slice(0, 8)

  if (!upcoming.length) return null

  return (
    <div className="card">
      <SectionTitle small>Upcoming Bills (Next 14 Days)</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {upcoming.map((bill) => (
          <div key={bill.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{bill.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>
                {bill.paidBy} · {bill.category}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {fmt(bill.amount ?? bill.defaultAmount)}
              </div>
              <div style={{ fontSize: 12, color: bill.days <= 3 ? 'var(--red)' : bill.days <= 7 ? 'var(--amber)' : 'var(--text-dim)', marginTop: 1 }}>
                {bill.days === 0 ? 'Today' : `In ${bill.days} day${bill.days !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertBanner({ type, text }) {
  const styles = {
    danger:  { bg: 'var(--red-dim)',   border: 'var(--red-border)',   color: 'var(--red)',   icon: '🚨' },
    warning: { bg: 'var(--amber-dim)', border: 'var(--amber-border)', color: 'var(--amber)', icon: '⚠️' },
    info:    { bg: 'var(--blue-dim)',  border: 'var(--blue-border)',  color: 'var(--blue)',  icon: 'ℹ️' },
  }
  const s = styles[type] ?? styles.info
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10,
      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, color: s.color,
    }}>
      <span>{s.icon}</span>
      {text}
    </div>
  )
}

function SectionTitle({ children, small }) {
  return (
    <div style={{ fontSize: small ? 13 : 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-dim)', fontSize: 14 }}>
      Loading your finances...
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

// ─── Primary Command Center Cards ────────────────────────────────────────────

function LeftoverHeroCard({ leftover, monthlyIncome, totalBills }) {
  const pct = monthlyIncome > 0 ? (leftover / monthlyIncome) * 100 : 0
  const billsPct = monthlyIncome > 0 ? Math.min(100, (totalBills / monthlyIncome) * 100) : 0

  const status = leftover < 0
    ? { label: 'Negative cash flow', color: 'var(--red)', bg: 'var(--red-dim)', border: 'var(--red-border)' }
    : pct < 10
    ? { label: '⚠ Tight — aim for 20%+', color: 'var(--amber)', bg: 'var(--amber-dim)', border: 'var(--amber-border)' }
    : pct < 20
    ? { label: '✓ Good', color: 'var(--green)', bg: 'var(--green-dim)', border: 'var(--green-border)' }
    : { label: '✓ Excellent', color: 'var(--green)', bg: 'var(--green-dim)', border: 'var(--green-border)' }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-dim)', marginBottom: 10 }}>
          Monthly Leftover
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: leftover >= 0 ? 'var(--green)' : 'var(--red)', letterSpacing: '-2px', lineHeight: 1, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(leftover)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          {fmtPct(Math.abs(pct))} of income {leftover >= 0 ? 'saved after bills' : 'over budget'}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
          <span>Bills {fmt(totalBills)}</span>
          <span>Income {fmt(monthlyIncome)}</span>
        </div>
        <div className="prog-track" style={{ height: 5, marginBottom: 14 }}>
          <div className="prog-fill" style={{ width: `${billsPct}%`, background: leftover >= 0 ? 'var(--blue)' : 'var(--red)' }} />
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 99,
          background: status.bg, border: `1px solid ${status.border}`,
          fontSize: 12, fontWeight: 600, color: status.color,
        }}>
          {status.label}
        </div>
      </div>
    </div>
  )
}

function IncomeCard({ monthlyIncome, sources, pctCommitted }) {
  const barColor = pctCommitted > 90 ? 'var(--red)' : pctCommitted > 75 ? 'var(--amber)' : 'var(--green)'
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-dim)', marginBottom: 10 }}>
          Monthly Income
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--green)', letterSpacing: '-2px', lineHeight: 1, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(monthlyIncome)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          {sources.length} source{sources.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
          <span>{fmtPct(pctCommitted)} committed</span>
          <span>{fmtPct(100 - pctCommitted)} free</span>
        </div>
        <div className="prog-track" style={{ height: 5 }}>
          <div className="prog-fill" style={{ width: `${Math.min(100, pctCommitted)}%`, background: barColor }} />
        </div>
      </div>
    </div>
  )
}

function BillsCard({ totalBills, paidAmt, allBills, checks }) {
  const paidCount = allBills.filter((b) => checks[b.id]).length
  const pct = totalBills > 0 ? Math.min(100, (paidAmt / totalBills) * 100) : 0
  const remaining = Math.max(0, totalBills - paidAmt)
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-dim)', marginBottom: 10 }}>
          Bills This Month
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--text)', letterSpacing: '-2px', lineHeight: 1, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(totalBills)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          {allBills.length} bills total
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
          <span style={{ color: 'var(--green)' }}>{fmt(paidAmt)} paid</span>
          <span style={{ color: remaining > 0 ? 'var(--amber)' : 'var(--text-dim)' }}>{fmt(remaining)} left</span>
        </div>
        <div className="prog-track" style={{ height: 5, marginBottom: 10 }}>
          <div className="prog-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : 'var(--blue)' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {paidCount} of {allBills.length} bills marked paid
        </div>
      </div>
    </div>
  )
}
