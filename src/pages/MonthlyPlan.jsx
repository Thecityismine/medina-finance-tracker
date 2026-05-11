import { useEffect, useMemo, useState } from 'react'
import { useFinance } from '../context/FinanceContext'
import PaycheckCard from '../components/bills/PaycheckCard'
import {
  fmt, sumBills, billsForPeriod, incomeForPeriod, subsForMonth, monthLabel, today,
} from '../utils/calculations'
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'

export default function MonthlyPlan() {
  const { bills, subscriptions, incomeSources, monthlyChecks, loadMonthlyChecks, toggleBillPaid } = useFinance()

  const now = today()
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)

  const checksKey = `${year}-${month}`
  const checks = monthlyChecks[checksKey] ?? {}

  useEffect(() => {
    loadMonthlyChecks(year, month)
  }, [year, month, loadMonthlyChecks])

  const activeBills = bills.filter((b) => b.active !== false)

  const p1Bills = useMemo(() => billsForPeriod(activeBills, 1), [activeBills])
  const p2Bills = useMemo(() => billsForPeriod(activeBills, 2), [activeBills])
  const p1Income = useMemo(() => incomeForPeriod(incomeSources, year, month, 1), [incomeSources, year, month])
  const p2Income = useMemo(() => incomeForPeriod(incomeSources, year, month, 2), [incomeSources, year, month])

  const p1Paid = Object.keys(checks).filter((id) => checks[id] && p1Bills.find((b) => b.id === id))
  const p2Paid = Object.keys(checks).filter((id) => checks[id] && p2Bills.find((b) => b.id === id))

  const activeSubs = subscriptions.filter((s) => s.active !== false)
  const { p1: subsP1, p2: subsP2 } = useMemo(
    () => subsForMonth(activeSubs, year, month),
    [activeSubs, year, month]
  )

  const handlePrev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const handleNext = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }
  const handleToday = () => { setYear(now.year); setMonth(now.month) }

  const totalIncome = p1Income + p2Income
  const subTotal = [...subsP1, ...subsP2].reduce((s, sub) => s + Number(sub.amount || 0), 0)
  const totalBills = sumBills([...p1Bills, ...p2Bills]) + subTotal
  const totalLeftover = totalIncome - totalBills
  const isCurrentMonth = year === now.year && month === now.month

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>
            Monthly Plan
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Paycheck-by-paycheck bill planning
          </div>
        </div>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handlePrev}>
            <ChevronLeft size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleToday} style={{ minWidth: 130 }}>
            <CalendarCheck size={13} />
            {monthLabel(year, month)}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleNext}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Monthly summary bar */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <SummaryItem label="Total Income" value={fmt(totalIncome)} color="var(--green)" />
        <Divider />
        <SummaryItem label="Total Bills" value={fmt(totalBills)} />
        <Divider />
        <SummaryItem label="Monthly Leftover" value={fmt(totalLeftover)} color={totalLeftover >= 0 ? 'var(--green)' : 'var(--red)'} />
        <Divider />
        <SummaryItem label="Bills Paid" value={`${Object.values(checks).filter(Boolean).length} / ${activeBills.length}`} />
        {isCurrentMonth && (
          <>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 6px var(--green)',
              }} />
              <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Current Month</span>
            </div>
          </>
        )}
      </div>

      {/* Two paycheck cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <PaycheckCard
          period={1}
          label="1st – 14th"
          income={p1Income}
          bills={p1Bills}
          paidBills={p1Paid}
          subscriptions={subsP1}
          onTogglePaid={toggleBillPaid}
          year={year}
          month={month}
        />
        <PaycheckCard
          period={2}
          label="15th – 31st"
          income={p2Income}
          bills={p2Bills}
          paidBills={p2Paid}
          subscriptions={subsP2}
          onTogglePaid={toggleBillPaid}
          year={year}
          month={month}
        />
      </div>
    </div>
  )
}

function SummaryItem({ label, value, color = 'var(--text)' }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-0.3px' }}>{value}</div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 4px' }} />
}
