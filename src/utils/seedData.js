// Initial seed data matching the original Supabase database.
// Run once from Settings → "Seed / Migrate Data" when Firestore is empty.

import { db } from '../firebase'
import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore'

export const SEED = {
  incomeSources: [
    { id: 'jorge-income', person: 'Jorge', amount: 8240, payDayOfWeek: 'Friday', nextPayDate: '2025-01-03' },
    { id: 'anseli-income', person: 'Anseli', amount: 3400, payDayOfWeek: 'Tuesday', nextPayDate: '2025-01-07' },
  ],

  bills: [
    // Rent
    { id: 'rent-main', name: 'Rent', amount: 3200, dueDate: 1, category: 'Rent', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: false, recurring: true, varies: false, active: true },

    // Credit card minimums
    { id: 'cc-chase-sapphire', name: 'Chase Sapphire Min', amount: 150, dueDate: 5, category: 'Credit Card', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: true, active: true },
    { id: 'cc-amex-gold', name: 'Amex Gold Min', amount: 85, dueDate: 10, category: 'Credit Card', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: true, active: true },
    { id: 'cc-discover', name: 'Discover Min', amount: 65, dueDate: 14, category: 'Credit Card', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: true, active: true },
    { id: 'cc-capital-one', name: 'Capital One Min', amount: 75, dueDate: 18, category: 'Credit Card', paidBy: 'Anseli', accountName: 'BofA Checking', autopay: true, recurring: true, varies: true, active: true },
    { id: 'cc-citi', name: 'Citi Min', amount: 95, dueDate: 20, category: 'Credit Card', paidBy: 'Anseli', accountName: 'BofA Checking', autopay: true, recurring: true, varies: true, active: true },
    { id: 'cc-barclay', name: 'Barclays Min', amount: 55, dueDate: 22, category: 'Credit Card', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: true, active: true },
    { id: 'cc-walmart', name: 'Walmart CC Min', amount: 35, dueDate: 25, category: 'Credit Card', paidBy: 'Anseli', accountName: 'BofA Checking', autopay: false, recurring: true, varies: true, active: true },
    { id: 'cc-target', name: 'Target RedCard Min', amount: 40, dueDate: 28, category: 'Credit Card', paidBy: 'Anseli', accountName: 'BofA Checking', autopay: false, recurring: true, varies: true, active: true },

    // Utilities
    { id: 'util-electric', name: 'FPL Electric', amount: 180, dueDate: 7, category: 'Utility', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: true, active: true },
    { id: 'util-internet', name: 'Optimum Internet', amount: 89, dueDate: 12, category: 'Utility', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: false, active: true },
    { id: 'util-phone-jorge', name: 'Verizon (Jorge)', amount: 65, dueDate: 15, category: 'Utility', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: false, active: true },
    { id: 'util-phone-anseli', name: 'Verizon (Anseli)', amount: 55, dueDate: 15, category: 'Utility', paidBy: 'Anseli', accountName: 'BofA Checking', autopay: true, recurring: true, varies: false, active: true },
    { id: 'util-water', name: 'Water Bill', amount: 75, dueDate: 20, category: 'Utility', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: false, recurring: true, varies: true, active: true },
    { id: 'util-sunpass', name: 'SunPass', amount: 30, dueDate: 5, category: 'Utility', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: true, active: true },

    // Personal
    { id: 'personal-gym', name: 'Gym Membership', amount: 50, dueDate: 3, category: 'Personal', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: false, active: true },
    { id: 'personal-haircut-j', name: 'Haircut (Jorge)', amount: 40, dueDate: 8, category: 'Personal', paidBy: 'Jorge', accountName: 'Cash', autopay: false, recurring: true, varies: false, active: true },
    { id: 'personal-hair-a', name: 'Hair Salon (Anseli)', amount: 120, dueDate: 20, category: 'Personal', paidBy: 'Anseli', accountName: 'BofA Checking', autopay: false, recurring: true, varies: true, active: true },
    { id: 'personal-gas', name: 'Gas (Jorge)', amount: 200, dueDate: 1, category: 'Personal', paidBy: 'Jorge', accountName: 'Cash', autopay: false, recurring: true, varies: true, active: true },
    { id: 'personal-gas-a', name: 'Gas (Anseli)', amount: 120, dueDate: 1, category: 'Personal', paidBy: 'Anseli', accountName: 'Cash', autopay: false, recurring: true, varies: true, active: true },
    { id: 'personal-groceries', name: 'Groceries', amount: 600, dueDate: 1, category: 'Personal', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: false, recurring: true, varies: true, active: true },
    { id: 'personal-daycare', name: 'Daycare', amount: 800, dueDate: 1, category: 'Personal', paidBy: 'Anseli', accountName: 'BofA Checking', autopay: false, recurring: true, varies: false, active: true },

    // Loans
    { id: 'loan-gmc', name: 'GMC Truck Payment', amount: 654, dueDate: 10, category: 'Loan', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: false, active: true },

    // Investments
    { id: 'invest-fundrise', name: 'Fundrise', amount: 200, dueDate: 5, category: 'Investment', paidBy: 'Jorge', accountName: 'Chase Checking', autopay: true, recurring: true, varies: false, active: true },
    { id: 'invest-savings', name: 'Emergency Fund', amount: 300, dueDate: 1, category: 'Investment', paidBy: 'Jorge', accountName: 'Ally Savings', autopay: true, recurring: true, varies: false, active: true },
    { id: 'invest-roth', name: 'Roth IRA', amount: 250, dueDate: 15, category: 'Investment', paidBy: 'Jorge', accountName: 'Fidelity', autopay: true, recurring: true, varies: false, active: true },
  ],

  creditCards: [
    { id: 'cc1', name: 'Chase Sapphire Reserve', balance: 12400, creditLimit: 20000, minPayment: 150, apr: 24.99, ownedBy: 'Jorge', dueDate: 5, active: true },
    { id: 'cc2', name: 'Amex Gold', balance: 8750, creditLimit: 15000, minPayment: 85, apr: 26.99, ownedBy: 'Jorge', dueDate: 10, active: true },
    { id: 'cc3', name: 'Discover It', balance: 5200, creditLimit: 8000, minPayment: 65, apr: 21.99, ownedBy: 'Jorge', dueDate: 14, active: true },
    { id: 'cc4', name: 'Capital One Venture', balance: 9800, creditLimit: 12000, minPayment: 75, apr: 22.99, ownedBy: 'Anseli', dueDate: 18, active: true },
    { id: 'cc5', name: 'Citi Double Cash', balance: 7300, creditLimit: 10000, minPayment: 95, apr: 23.49, ownedBy: 'Anseli', dueDate: 20, active: true },
    { id: 'cc6', name: 'Barclays Arrival', balance: 4100, creditLimit: 7500, minPayment: 55, apr: 19.99, ownedBy: 'Jorge', dueDate: 22, active: true },
    { id: 'cc7', name: 'Walmart Rewards', balance: 2800, creditLimit: 5000, minPayment: 35, apr: 26.99, ownedBy: 'Anseli', dueDate: 25, active: true },
    { id: 'cc8', name: 'Target RedCard', balance: 1650, creditLimit: 3000, minPayment: 40, apr: 24.15, ownedBy: 'Anseli', dueDate: 28, active: true },
    { id: 'cc9', name: 'Amazon Store Card', balance: 950, creditLimit: 2500, minPayment: 30, apr: 28.99, ownedBy: 'Jorge', dueDate: 3, active: true },
  ],

  loans: [
    { id: 'loan1', name: 'GMC Sierra Loan', balance: 954, monthlyPayment: 243, apr: 6.9, dueDate: 10, active: true },
  ],

  subscriptions: [
    { id: 'sub-netflix', name: 'Netflix', amount: 22.99, dueDate: 5, frequency: 'Monthly', owner: 'Jorge', active: true },
    { id: 'sub-spotify', name: 'Spotify Family', amount: 16.99, dueDate: 8, frequency: 'Monthly', owner: 'Jorge', active: true },
    { id: 'sub-hbo', name: 'HBO Max', amount: 15.99, dueDate: 12, frequency: 'Monthly', owner: 'Anseli', active: true },
    { id: 'sub-disney', name: 'Disney+', amount: 13.99, dueDate: 15, frequency: 'Monthly', owner: 'Anseli', active: true },
    { id: 'sub-apple', name: 'Apple One', amount: 21.95, dueDate: 18, frequency: 'Monthly', owner: 'Jorge', active: true },
    { id: 'sub-youtube', name: 'YouTube Premium', amount: 13.99, dueDate: 20, frequency: 'Monthly', owner: 'Jorge', active: true },
    { id: 'sub-amazon', name: 'Amazon Prime', amount: 139, dueDate: 15, frequency: 'Yearly', owner: 'Jorge', active: true },
    { id: 'sub-costco', name: 'Costco Membership', amount: 65, dueDate: 6, frequency: 'Yearly', owner: 'Jorge', active: true },
    { id: 'sub-norton', name: 'Norton 360', amount: 99.99, dueDate: 3, frequency: 'Yearly', owner: 'Jorge', active: true },
    { id: 'sub-adobe', name: 'Adobe Creative Cloud', amount: 599.88, dueDate: 20, frequency: 'Yearly', owner: 'Jorge', active: true },
    { id: 'sub-icloud', name: 'iCloud Storage (2TB)', amount: 32.97, dueDate: 10, frequency: 'Quarterly', owner: 'Jorge', active: true },
  ],

  settings: {
    payoffMethod: 'avalanche',
    categories: ['Rent', 'Credit Card', 'Utility', 'Personal', 'Loan', 'Investment', 'Subscription'],
    owners: ['Jorge', 'Anseli'],
    paycheckPeriods: [
      { label: '1st – 15th', start: 1, end: 15 },
      { label: '16th – 31st', start: 16, end: 31 },
    ],
  },
}

export async function seedFirestore(onProgress) {
  const batch = writeBatch(db)
  let count = 0

  const write = (colName, items) => {
    for (const item of items) {
      const { id, ...data } = item
      const ref = doc(collection(db, colName), id)
      batch.set(ref, { ...data, createdAt: new Date().toISOString() })
      count++
    }
  }

  write('income_sources', SEED.incomeSources)
  write('bills', SEED.bills)
  write('credit_cards', SEED.creditCards)
  write('loans', SEED.loans)
  write('subscriptions', SEED.subscriptions)

  // Settings as single document
  batch.set(doc(db, 'settings', 'app'), { ...SEED.settings, updatedAt: new Date().toISOString() })

  await batch.commit()
  onProgress?.(`Seeded ${count} records to Firestore`)
}

export async function isFirestoreEmpty() {
  const snap = await getDocs(collection(db, 'bills'))
  return snap.empty
}
