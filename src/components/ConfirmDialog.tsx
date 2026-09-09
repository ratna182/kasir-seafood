'use client'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Ya',
  cancelText = 'Batal',
  type = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const colors = {
    danger: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-accent)',
  }

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      style={{ zIndex: 300 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: `${colors[type]}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>
              {type === 'danger' ? '⚠️' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn btn-ghost">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${type === 'danger' ? 'btn-danger' : type === 'warning' ? 'btn-warning' : 'btn-primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
