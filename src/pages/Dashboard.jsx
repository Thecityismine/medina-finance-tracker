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
  AlertTriangle, CheckCircle2, Clock, Zap, Receipt,
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
      const d = daysUntilDue(b.dueDate)
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
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>
          Good {greeting()}, Medina Family 👋
        </h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')} · Financial Command Center
        </div>
      </div>

      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((a, i) => (
            <AlertBanner key={i} type={a.type} text={a.text} />
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        <KPICard
          label="Monthly Income"
          value={fmt(monthlyIncome)}
          sub={`${incomeSources.length} paycheck sources`}
          icon={<DollarSign size={16} />}
          color="var(--green)"
        />
        <KPICard
          label="Bills This Month"
          value={fmt(totalBills)}
          sub={`${allBills.length} bills`}
          icon={<Receipt size={16} />}
        />
        <KPICard
          label="Monthly Leftover"
          value={fmt(leftover)}
          sub={leftover < 0 ? 'In the red!' : fmtPct(leftover / monthlyIncome * 100) + ' of income'}
          color={leftover >= 0 ? 'var(--green)' : 'var(--red)'}
          icon={<CheckCircle2 size={16} />}
        />
        <KPICard
          label="Total Debt"
          value={fmt(totalDebt)}
          sub={`${creditCards.length} cards + ${loans.length} loans`}
          color="var(--red)"
          icon={<TrendingDown size={16} />}
        />
        <KPICard
          label="Credit Utilization"
          value={fmtPct(utilPct)}
          sub={utilPct > 70 ? '⚠ Critical' : utilPct > 30 ? '⚠ High' : '✓ Healthy'}
          color={utilPct > 70 ? 'var(--red)' : utilPct > 30 ? 'var(--amber)' : 'var(--green)'}
          icon={<CreditCard size={16} />}
        />
        <KPICard
          label="Monthly Subs"
          value={fmt(monthlySubs)}
          sub={`${fmt(annualSubs)}/year`}
          icon={<Zap size={16} />}
        />
        {nextCheck && (
          <KPICard
            label="Next Paycheck"
            value={fmt(nextCheck.amount)}
            sub={`${nextCheck.person} · ${format(nextCheck.date, 'MMM d')}`}
            color="var(--green)"
            icon={<Calendar size={16} />}
          />
        )}
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
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <MiniStat label="Income" value={fmt(income)} color="var(--green)" />
        <MiniStat label="Bills Due" value={fmt(total)} />
        <MiniStat label="Paid" value={fmt(paid)} color="var(--green)" />
        <MiniStat label="Unpaid" value={fmt(unpaid)} color={unpaid > 0 ? 'var(--amber)' : 'var(--text-dim)'} />
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
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
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function UpcomingBills({ bills, checks }) {
  const upcoming = bills
    .map((b) => ({ ...b, days: daysUntilDue(b.dueDate) }))
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
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{bill.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                {bill.paidBy} · {bill.category}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {fmt(bill.amount ?? bill.defaultAmount)}
              </div>
              <div style={{ fontSize: 11, color: bill.days <= 3 ? 'var(--red)' : bill.days <= 7 ? 'var(--amber)' : 'var(--text-dim)', marginTop: 1 }}>
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
      fontSize: 13, color: s.color,
    }}>
      <span>{s.icon}</span>
      {text}
    </div>
  )
}

function SectionTitle({ children, small }) {
  return (
    <div style={{ fontSize: small ? 12 : 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
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
