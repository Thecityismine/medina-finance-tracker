const VARIANTS = {
  paid:       { bg: 'var(--green-dim)',  color: 'var(--green)',  border: 'var(--green-border)',  label: 'Paid' },
  upcoming:   { bg: 'var(--blue-dim)',   color: 'var(--blue)',   border: 'var(--blue-border)',   label: 'Upcoming' },
  'due-soon': { bg: 'var(--amber-dim)',  color: 'var(--amber)',  border: 'var(--amber-border)',  label: 'Due Soon' },
  overdue:    { bg: 'var(--red-dim)',    color: 'var(--red)',    border: 'var(--red-border)',    label: 'Overdue' },
  scheduled:  { bg: 'var(--surface-3)', color: 'var(--text-muted)', border: 'var(--border)',    label: 'Scheduled' },
  autopay:    { bg: 'var(--green-dim)',  color: 'var(--green)',  border: 'var(--green-border)',  label: 'Autopay' },
  manual:     { bg: 'var(--surface-3)', color: 'var(--text-dim)',   border: 'var(--border)',    label: 'Manual' },
  jorge:      { bg: 'var(--blue-dim)',   color: 'var(--blue)',   border: 'var(--blue-border)',   label: 'Jorge' },
  anseli:     { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)', label: 'Anseli' },
  monthly:    { bg: 'var(--blue-dim)',   color: 'var(--blue)',   border: 'var(--blue-border)',   label: 'Monthly' },
  yearly:     { bg: 'var(--green-dim)',  color: 'var(--green)',  border: 'var(--green-border)',  label: 'Yearly' },
  quarterly:  { bg: 'var(--amber-dim)', color: 'var(--amber)',  border: 'var(--amber-border)',  label: 'Quarterly' },
  '6 months': { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)', label: '6 Months' },
}

export default function Badge({ variant = 'scheduled', label, size = 'md' }) {
  const v = VARIANTS[variant?.toLowerCase()] ?? VARIANTS.scheduled
  const display = label ?? v.label

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: v.bg,
      color: v.color,
      border: `1px solid ${v.border}`,
      borderRadius: 99,
      fontSize: size === 'sm' ? 10 : 11,
      fontWeight: 600,
      padding: size === 'sm' ? '2px 7px' : '3px 9px',
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {display}
    </span>
  )
}
