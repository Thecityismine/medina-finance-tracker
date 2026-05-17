import { useState } from 'react'
import { useFinance } from '../context/FinanceContext'
import { fmt } from '../utils/calculations'
import { seedFirestore, isFirestoreEmpty } from '../utils/seedData'
import { Edit2, Save, X, Download, Upload, Database, Check, Plus, Tag } from 'lucide-react'
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

export default function Settings() {
  const { incomeSources, updateIncomeSource, appSettings, updateSettings } = useFinance()

  const [editIncome, setEditIncome] = useState(null)
  const [newSubCategory, setNewSubCategory] = useState('')
  const [subCatSaving, setSubCatSaving] = useState(false)
  const [subCatError, setSubCatError] = useState('')
  const [incomeForm, setIncomeForm] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [seedStatus, setSeedStatus] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')

  const openEditIncome = (src) => {
    setEditIncome(src.id)
    setSaveError('')
    setIncomeForm({ amount: src.amount, nextPayDate: src.nextPayDate ?? src.next_pay_date ?? '' })
  }

  const saveIncome = async (id) => {
    if (!incomeForm.amount || Number(incomeForm.amount) <= 0) {
      setSaveError('Amount must be greater than 0')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await updateIncomeSource(id, {
        amount: Number(incomeForm.amount),
        nextPayDate: incomeForm.nextPayDate || null,
      })
      setEditIncome(null)
    } catch (e) {
      setSaveError(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const subCategories = appSettings?.subscriptionCategories ?? []

  const addSubCategory = async () => {
    const name = newSubCategory.trim()
    if (!name) return
    if (subCategories.includes(name)) {
      setSubCatError('Category already exists')
      return
    }
    setSubCatSaving(true)
    setSubCatError('')
    try {
      await updateSettings({ subscriptionCategories: [...subCategories, name] })
      setNewSubCategory('')
    } catch (e) {
      setSubCatError(`Failed: ${e.message}`)
    }
    setSubCatSaving(false)
  }

  const removeSubCategory = async (cat) => {
    try {
      await updateSettings({ subscriptionCategories: subCategories.filter((c) => c !== cat) })
    } catch (e) {
      alert(`Remove failed: ${e.message}`)
    }
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

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const confirmed = confirm(
      'This will DELETE all existing data and replace it with the contents of the file. Continue?'
    )
    if (!confirmed) return

    setImporting(true)
    setImportStatus('Reading file...')
    try {
      const parsed = JSON.parse(await file.text())

      // Support both export formats:
      // New app:  { bills: [], credit_cards: [], income_sources: [], ... }
      // Old app:  { version, data: { bills: [], cards: [], income: [], ... } }
      const src = parsed.data ?? parsed

      // Map old key names → Firestore collection names
      const collections = {
        bills:          src.bills,
        credit_cards:   src.credit_cards ?? src.cards,
        loans:          src.loans,
        subscriptions:  src.subscriptions,
        income_sources: src.income_sources ?? src.income,
        monthly_checks: src.monthly_checks,
      }

      let totalWritten = 0

      for (const [col, incoming] of Object.entries(collections)) {
        if (!Array.isArray(incoming) || incoming.length === 0) continue

        setImportStatus(`Clearing ${col}...`)
        const existing = await getDocs(collection(db, col))
        for (let i = 0; i < existing.docs.length; i += 450) {
          const batch = writeBatch(db)
          existing.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
          await batch.commit()
        }

        setImportStatus(`Writing ${col} (${incoming.length} records)...`)
        for (let i = 0; i < incoming.length; i += 450) {
          const batch = writeBatch(db)
          incoming.slice(i, i + 450).forEach(({ id, ...fields }) => {
            if (!id) return
            batch.set(doc(db, col, id), fields)
          })
          await batch.commit()
          totalWritten += incoming.slice(i, i + 450).length
        }
      }

      setImportStatus(`✓ Import complete — ${totalWritten} records written`)
    } catch (err) {
      setImportStatus(`Error: ${err.message}`)
    }
    setImporting(false)
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
                    {saveError && (
                      <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 6, width: '100%' }}>
                        {saveError}
                      </div>
                    )}
                    <button
                      className="btn btn-green btn-sm"
                      onClick={() => saveIncome(src.id)}
                      disabled={saving}
                      style={{ opacity: saving ? 0.6 : 1 }}
                    >
                      <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditIncome(null); setSaveError('') }}>
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

      {/* Bill Categories (read-only) */}
      <Section title="Bill Categories">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(appSettings?.categories ?? []).map((cat) => (
            <div key={cat} style={{
              padding: '6px 14px', borderRadius: 99,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              fontSize: 13, color: 'var(--text-muted)',
            }}>
              {cat}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
          Used for bills and expenses.
        </div>
      </Section>

      {/* Subscription Categories */}
      <Section title="Subscription Categories">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          These categories appear in the Subscriptions page. Add your own or remove ones you don't use.
        </div>

        {/* Existing category chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {subCategories.map((cat) => (
            <div
              key={cat}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px 5px 12px', borderRadius: 99,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--text-muted)',
              }}
            >
              <Tag size={11} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
              <span>{cat}</span>
              <button
                onClick={() => removeSubCategory(cat)}
                title={`Remove "${cat}"`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-dim)', padding: '1px 2px',
                  display: 'flex', alignItems: 'center',
                  borderRadius: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {subCategories.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>No categories yet.</div>
          )}
        </div>

        {/* Add new category */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <input
              className="inp"
              placeholder="New category name…"
              value={newSubCategory}
              onChange={(e) => { setNewSubCategory(e.target.value); setSubCatError('') }}
              onKeyDown={(e) => e.key === 'Enter' && addSubCategory()}
              style={{ fontSize: 14 }}
            />
            {subCatError && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{subCatError}</div>
            )}
          </div>
          <button
            className="btn btn-green"
            onClick={addSubCategory}
            disabled={subCatSaving || !newSubCategory.trim()}
            style={{ opacity: subCatSaving || !newSubCategory.trim() ? 0.5 : 1, flexShrink: 0 }}
          >
            <Plus size={14} /> {subCatSaving ? 'Adding…' : 'Add'}
          </button>
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

          {/* Import */}
          <div className="card" style={{ borderColor: importStatus.startsWith('✓') ? 'var(--green-border)' : importStatus.startsWith('Error') ? 'var(--red)' : 'var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  <Upload size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Import Data
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Replace all Firestore data with a previously exported JSON file.
                  This will overwrite everything — export a backup first.
                </div>
                {importStatus && (
                  <div style={{ marginTop: 8, fontSize: 12, color: importStatus.startsWith('✓') ? 'var(--green)' : importStatus.startsWith('Error') ? 'var(--red)' : 'var(--amber)' }}>
                    {importStatus}
                  </div>
                )}
              </div>
              <label
                className="btn btn-ghost"
                style={{ opacity: importing ? 0.6 : 1, flexShrink: 0, cursor: importing ? 'default' : 'pointer' }}
              >
                <Upload size={13} /> {importing ? 'Importing...' : 'Import JSON'}
                <input
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  disabled={importing}
                  onChange={handleImport}
                />
              </label>
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
