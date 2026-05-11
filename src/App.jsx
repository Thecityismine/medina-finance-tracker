import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { FinanceProvider } from './context/FinanceContext'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import MonthlyPlan from './pages/MonthlyPlan'
import Bills from './pages/Bills'
import Debt from './pages/Debt'
import Subscriptions from './pages/Subscriptions'
import Expenses from './pages/Expenses'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <FinanceProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monthly" element={<MonthlyPlan />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/debt" element={<Debt />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </FinanceProvider>
    </BrowserRouter>
  )
}
