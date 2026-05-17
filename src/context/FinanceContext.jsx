import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  setDoc, getDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { today } from '../utils/calculations'

const FinanceContext = createContext(null)

export function FinanceProvider({ children }) {
  const [incomeSources, setIncomeSources] = useState([])
  const [bills, setBills] = useState([])
  const [creditCards, setCreditCards] = useState([])
  const [loans, setLoans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [monthlyChecks, setMonthlyChecks] = useState({})
  const [appSettings, setAppSettings] = useState({
    payoffMethod: 'avalanche',
    categories: ['Rent', 'Credit Card', 'Utility', 'Personal', 'Loan', 'Investment', 'Subscription'],
    subscriptionCategories: [
      'Software & AI', 'Streaming', 'Insurance', 'Fitness', 'Cloud & Hosting',
      'Domain & Website', 'Security & Privacy', 'Productivity', 'Automotive',
      'Home Services', 'Kids & Gaming', 'Storage & Backup', 'Professional Tools',
      'Utilities', 'Other',
    ],
    owners: ['Jorge', 'Anseli'],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Current view month for monthly checks
  const [viewMonth, setViewMonth] = useState(() => today())

  useEffect(() => {
    const unsubs = []
    // Track which collections have fired at least once — loading clears when all 6 are ready
    // expenses loads independently and does not block initial render
    const ready = new Set()
    const total = 6
    const markReady = (key) => {
      ready.add(key)
      if (ready.size >= total) setLoading(false)
    }
    const err = (e) => { setError(e.message); setLoading(false) }

    unsubs.push(onSnapshot(collection(db, 'income_sources'), (s) => {
      setIncomeSources(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      markReady('income')
    }, err))

    unsubs.push(onSnapshot(collection(db, 'bills'), (s) => {
      setBills(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => b.active !== false))
      markReady('bills')
    }, err))

    unsubs.push(onSnapshot(collection(db, 'credit_cards'), (s) => {
      setCreditCards(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => c.active !== false))
      markReady('cards')
    }, err))

    unsubs.push(onSnapshot(collection(db, 'loans'), (s) => {
      setLoans(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => l.active !== false))
      markReady('loans')
    }, err))

    unsubs.push(onSnapshot(collection(db, 'subscriptions'), (s) => {
      setSubscriptions(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s2) => s2.active !== false))
      markReady('subs')
    }, err))

    unsubs.push(onSnapshot(collection(db, 'expenses'), (s) => {
      setExpenses(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    }, (e) => console.warn('expenses listener:', e.message)))

    const settingsRef = doc(db, 'settings', 'app')
    unsubs.push(onSnapshot(settingsRef, (s) => {
      if (s.exists()) setAppSettings((prev) => ({ ...prev, ...s.data() }))
      markReady('settings')
    }, err))

    return () => unsubs.forEach((u) => u())
  }, [])

  // Load monthly checks for a given year/month
  const loadMonthlyChecks = useCallback(async (year, month) => {
    const key = `${year}-${month}`
    const ref = doc(db, 'monthly_checks', key)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      setMonthlyChecks((prev) => ({ ...prev, [key]: snap.data().checks ?? {} }))
    } else {
      setMonthlyChecks((prev) => ({ ...prev, [key]: {} }))
    }
  }, [])

  // Toggle a bill's paid state for a month
  const toggleBillPaid = useCallback(async (billId, year, month) => {
    const key = `${year}-${month}`
    const current = monthlyChecks[key] ?? {}
    const newChecks = { ...current, [billId]: !current[billId] }
    setMonthlyChecks((prev) => ({ ...prev, [key]: newChecks }))
    await setDoc(doc(db, 'monthly_checks', key), { checks: newChecks, updatedAt: serverTimestamp() }, { merge: true })
  }, [monthlyChecks])

  const isBillPaid = useCallback((billId, year, month) => {
    const key = `${year}-${month}`
    return !!(monthlyChecks[key]?.[billId])
  }, [monthlyChecks])

  // ─── CRUD helpers ────────────────────────────────────────────────────────────

  const addBill = (data) => addDoc(collection(db, 'bills'), { ...data, active: true, createdAt: serverTimestamp() })
  const updateBill = (id, data) => updateDoc(doc(db, 'bills', id), { ...data, updatedAt: serverTimestamp() })
  const deleteBill = (id) => updateDoc(doc(db, 'bills', id), { active: false })

  const addCreditCard = (data) => addDoc(collection(db, 'credit_cards'), { ...data, active: true, createdAt: serverTimestamp() })
  const updateCreditCard = (id, data) => updateDoc(doc(db, 'credit_cards', id), { ...data, updatedAt: serverTimestamp() })
  const deleteCreditCard = (id) => updateDoc(doc(db, 'credit_cards', id), { active: false })

  const addLoan = (data) => addDoc(collection(db, 'loans'), { ...data, active: true, createdAt: serverTimestamp() })
  const updateLoan = (id, data) => updateDoc(doc(db, 'loans', id), { ...data, updatedAt: serverTimestamp() })
  const deleteLoan = (id) => updateDoc(doc(db, 'loans', id), { active: false })

  const addSubscription = (data) => addDoc(collection(db, 'subscriptions'), { ...data, active: true, createdAt: serverTimestamp() })
  const updateSubscription = (id, data) => updateDoc(doc(db, 'subscriptions', id), { ...data, updatedAt: serverTimestamp() })
  const deleteSubscription = (id) => updateDoc(doc(db, 'subscriptions', id), { active: false })

  const addExpense = (data) => addDoc(collection(db, 'expenses'), { ...data, createdAt: serverTimestamp() })
  const updateExpense = (id, data) => updateDoc(doc(db, 'expenses', id), { ...data, updatedAt: serverTimestamp() })
  const deleteExpense = (id) => deleteDoc(doc(db, 'expenses', id))

  // setDoc with merge so it creates the doc if it doesn't exist yet
  const updateIncomeSource = (id, data) => setDoc(doc(db, 'income_sources', id), { ...data, updatedAt: serverTimestamp() }, { merge: true })

  const updateSettings = (data) => setDoc(doc(db, 'settings', 'app'), { ...data, updatedAt: serverTimestamp() }, { merge: true })

  const value = {
    // Data
    incomeSources, bills, creditCards, loans, subscriptions, expenses,
    monthlyChecks, appSettings, loading, error,
    // View state
    viewMonth, setViewMonth,
    // Monthly checks
    loadMonthlyChecks, toggleBillPaid, isBillPaid,
    // Bill CRUD
    addBill, updateBill, deleteBill,
    // Credit card CRUD
    addCreditCard, updateCreditCard, deleteCreditCard,
    // Loan CRUD
    addLoan, updateLoan, deleteLoan,
    // Subscription CRUD
    addSubscription, updateSubscription, deleteSubscription,
    // Expense CRUD
    addExpense, updateExpense, deleteExpense,
    // Income
    updateIncomeSource,
    // Settings
    updateSettings,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
