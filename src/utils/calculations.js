import { addDays, startOfDay, isBefore, isAfter, isEqual, format, addWeeks } from 'date-fns'

export const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)

export const fmtFull = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0)

export const fmtPct = (n) => `${Math.round(n ?? 0)}%`

// Returns { start, end } for period 1 (days 1-15) and period 2 (days 16-end)
export function getPayPeriods(year, month) {
  const p1Start = new Date(year, month - 1, 1)
  const p1End = new Date(year, month - 1, 15)
  const p2Start = new Date(year, month - 1, 16)
  const p2End = new Date(year, month, 0) // last day of month
  return [
    { period: 1, start: p1Start, end: p1End, label: '1st – 15th' },
    { period: 2, start: p2Start, end: p2End, label: '16th – 31st' },
  ]
}

// Assigns a bill to period 1 or 2 based on its dueDate (day of month)
export function billPeriod(dueDate) {
  return dueDate <= 15 ? 1 : 2
}

// Filter bills by period
export function billsForPeriod(bills, period) {
  return bills.filter((b) => b.active !== false && billPeriod(b.dueDate ?? b.due_date) === period)
}

// Sum amounts
export function sumBills(bills) {
  return bills.reduce((acc, b) => acc + (Number(b.amount ?? b.defaultAmount ?? b.default_amount) || 0), 0)
}

// Calculate all paychecks within a date range using bi-weekly schedule
export function getPaychecksInRange(nextPayDate, amount, startDate, endDate) {
  if (!nextPayDate) return []
  let d = startOfDay(new Date(nextPayDate))
  const start = startOfDay(new Date(startDate))
  const end = startOfDay(new Date(endDate))
  const checks = []

  // Walk backwards to find the first check on or before startDate
  while (isAfter(d, end)) d = addWeeks(d, -2)
  while (isBefore(addWeeks(d, -2), start) || isEqual(addWeeks(d, -2), start)) d = addWeeks(d, -2)

  // Walk forward collecting checks in range
  while (isBefore(d, start)) d = addWeeks(d, 2)
  while (isBefore(d, end) || isEqual(d, end)) {
    checks.push({ date: new Date(d), amount })
    d = addWeeks(d, 2)
  }
  return checks
}

// Income for a specific pay period (year, month, period 1 or 2) per person
export function incomeForPeriod(incomeSources, year, month, period) {
  const periods = getPayPeriods(year, month)
  const { start, end } = periods[period - 1]
  return incomeSources.reduce((acc, src) => {
    const checks = getPaychecksInRange(
      src.nextPayDate ?? src.next_pay_date,
      Number(src.amount),
      start,
      end
    )
    return acc + checks.reduce((s, c) => s + c.amount, 0)
  }, 0)
}

// Who owes whom based on period bills and income
export function calculateTransfer(billsByPerson, incomByPerson) {
  const owners = Object.keys(incomByPerson)
  if (owners.length < 2) return null
  const [a, b] = owners
  const aNet = (incomByPerson[a] || 0) - (billsByPerson[a] || 0)
  const bNet = (incomByPerson[b] || 0) - (billsByPerson[b] || 0)
  const total = aNet + bNet
  const each = total / 2
  const aOwes = aNet - each
  if (aOwes > 0) return { from: a, to: b, amount: aOwes }
  if (aOwes < 0) return { from: b, to: a, amount: Math.abs(aOwes) }
  return null
}

// Current pay period (1 or 2) based on today
export function currentPeriod() {
  return new Date().getDate() <= 15 ? 1 : 2
}

// Days until a due date this month
export function daysUntilDue(dueDay, fromDate = new Date()) {
  const today = startOfDay(fromDate)
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay)
  if (isBefore(thisMonth, today)) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
    return Math.ceil((nextMonth - today) / 86400000)
  }
  return Math.ceil((thisMonth - today) / 86400000)
}

// Bill status for display
export function billStatus(dueDay, isPaid) {
  if (isPaid) return 'paid'
  const days = daysUntilDue(dueDay)
  const today = new Date().getDate()
  if (dueDay < today && days > 20) return 'overdue' // wrapped to next month but was this month
  if (days < 0) return 'overdue'
  if (days <= 3) return 'due-soon'
  if (days <= 7) return 'upcoming'
  return 'scheduled'
}

// Credit utilization
export function creditUtilization(cards) {
  const balance = cards.reduce((s, c) => s + Number(c.balance || 0), 0)
  const limit = cards.reduce((s, c) => s + Number((c.creditLimit ?? c.credit_limit) || 0), 0)
  return limit > 0 ? (balance / limit) * 100 : 0
}

// Debt payoff order
export function payoffOrder(cards, method = 'avalanche') {
  const list = [...cards].filter((c) => Number(c.balance) > 0)
  if (method === 'avalanche') return list.sort((a, b) => Number(b.apr) - Number(a.apr))
  return list.sort((a, b) => Number(a.balance) - Number(b.balance)) // snowball
}

// Next paycheck across all sources
export function nextPaycheck(incomeSources) {
  const today = startOfDay(new Date())
  let nearest = null
  for (const src of incomeSources) {
    let d = startOfDay(new Date(src.nextPayDate ?? src.next_pay_date))
    while (isBefore(d, today)) d = addWeeks(d, 2)
    if (!nearest || isBefore(d, nearest.date)) {
      nearest = { date: d, amount: Number(src.amount), person: src.person }
    }
  }
  return nearest
}

export function monthLabel(year, month) {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy')
}

export function today() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}
