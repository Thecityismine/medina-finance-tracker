import { useState } from 'react'
import { useFinance } from '../context/FinanceContext'
import { fmt } from '../utils/calculations'
import { seedFirestore, isFirestoreEmpty } from '../utils/seedData'
import { Edit2, Save, X, Download, Database, Check } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Settings() {
  const { incomeSources, updateIncomeSource, appSettings, updateSettings } = useFinance()

  const [editIncome, setEditIncome] = useState(null)
  const [incomeForm, setIncomeForm] = useState({})
  const [seedStatus, setSeedStatus] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [exporting, setExporting] = useState(false)

  const openEditIncome = (src) => {
    setEditIncome(src.id)
    setIncomeForm({ amount: src.amount, nextPayDate: src.nextPayDate ?? src.next_pay_date ?? '' })
  }

  const saveIncome = async (id) => {
    await updateIncomeSource(id, {
      amount: Number(incomeForm.amount),
      nextPayDate: incomeForm.nextPayDate,
    })
    setEditIncome(null)
  }

  const handleSeedData = async () => {
    setSeeding(true)
    setSeedStatus('Checking Firestore...')
    try {
      const empty = await isFirestoreEmpty()
      if (!empty) {
        const confirmed = confirm('Firestore already has bill data. Seed anyway? This will add duplicate records.')
        if (!confirmed) { setSeeding(false); setSeedStatus(''); return }
      }
      setSeedStatus('Seeding data...')
      await seedFirestore((msg) => setSeedStatus(msg))
      setSeedStatus('✓ All data seeded successfully!')
    } catch (e) {
      setSeedStatus(`Error: ${e.message}`)
    }
    setSeeding(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const colls = ['bills', 'credit_cards', 'loans', 'subscriptions', 'income_sources', 'monthly_checks']
      const data = {}
      for (const col of colls) {
        const snap = await getDocs(collection(db, col))
        data[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `medina-finance-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`Export failed: ${e.message}`)
    }
    setExporting(false)
  }

  const monthlyTotal = incomeSources.reduce((s, src) => s + Number(src.amount) * 2, 0)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text)' }}>Settings</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Manage income, categories, and data</div>
      </div>

      {/* Income Summary */}
      <Section title="Income Sources">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div className="card" style={{ background: 'var(--green-dim)', borderColor: 'var(--green-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Combined Monthly</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{fmt(monthlyTotal)}</div>
            <div style={{ fontSize: 12, color: 'var(--green)', opacity: 0.7, marginTop: 2 }}>Approximate (bi-weekly × 2)</div>
          </div>
        </div>

        {incomeSources.map((src) => (
          <div key={src.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  {src.person}
                </div>
                {editIncome === src.id ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Paycheck Amount</label>
                      <input
                        className="inp"
                        type="number"
                        value={incomeForm.amount || ''}
                        onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                        style={{ width: 160 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Next Pay Date</label>
                      <input
                        className="inp"
                        type="date"
                        value={incomeForm.nextPayDate || ''}
                        onChange={(e) => setIncomeForm({ ...incomeForm, nextPayDate: e.target.value })}
                        style={{ width: 180 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Paycheck: <strong style={{ color: 'var(--green)' }}>{fmt(src.amount)}</strong></span>
                    <span>Monthly: <strong style={{ color: 'var(--text)' }}>{fmt(Number(src.amount) * 2)}</strong></span>
                    <span>Next pay: <strong style={{ color: 'var(--text)' }}>{src.nextPayDate ?? src.next_pay_date ?? '—'}</strong></span>
                    <span>Pay day: {src.payDayOfWeek ?? src.pay_day_of_week}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {editIncome === src.id ? (
                  <>
                    <button className="btn btn-green btn-sm" onClick={() => saveIncome(src.id)}>
                      <Save size={13} /> Save
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditIncome(null)}>
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <button className="btn-icon btn-sm" onClick={() => openEditIncome(src)}>
                    <Edit2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </Section>

      {/* Categories */}
      <Section title="Bill Categories">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(appSettings?.categories ?? []).map((cat) => (
            <div key={cat} style={{
              padding: '6px 14px',
              borderRadius: 99,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--text-muted)',
            }}>
              {cat}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
          Categories are managed globally. Add custom categories here.
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Seed Data */}
          <div className="card" style={{ borderColor: seedStatus.startsWith('✓') ? 'var(--green-border)' : 'var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  <Database size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Seed Initial Data
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Populate Firestore with all default bills, credit cards, loans, and subscriptions from the original app.
                  Run this once when setting up a fresh Firestore database.
                </div>
                {seedStatus && (
                  <div style={{ marginTop: 8, fontSize: 12, color: seedStatus.startsWith('✓') ? 'var(--green)' : seedStatus.startsWith('Error') ? 'var(--red)' : 'var(--amber)' }}>
                    {seedStatus}
                  </div>
                )}
              </div>
              <button
                className="btn btn-ghost"
                onClick={handleSeedData}
                disabled={seeding}
                style={{ opacity: seeding ? 0.6 : 1, flexShrink: 0 }}
              >
                {seeding ? 'Seeding...' : (seedStatus.startsWith('✓') ? <><Check size={13} /> Done</> : 'Seed Data')}
              </button>
            </div>
          </div>

          {/* Export */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  <Download size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Export Data
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Download all your financial data as a JSON file for backup or migration.
                </div>
              </div>
              <button className="btn btn-ghost" onClick={handleExport} disabled={exporting} style={{ opacity: exporting ? 0.6 : 1, flexShrink: 0 }}>
                <Download size={13} /> {exporting ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* App Info */}
      <Section title="About">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InfoRow label="App" value="Medina Family Finance Tracker" />
          <InfoRow label="Version" value="2.0.0" />
          <InfoRow label="Database" value="Firebase Firestore" />
          <InfoRow label="Hosting" value="Vercel" />
          <InfoRow label="Built with" value="React + Vite + Tailwind CSS" />
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
