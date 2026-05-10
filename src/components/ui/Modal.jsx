import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `min(${width}px, calc(100vw - 32px))`,
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 16,
        zIndex: 50,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        maxHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ padding: 6, background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </>
  )
}

// Reusable form row
export function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// Modal footer with action buttons
export function ModalFooter({ children }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end',
      paddingTop: 16,
      marginTop: 8,
      borderTop: '1px solid var(--border)',
    }}>
      {children}
    </div>
  )
}
