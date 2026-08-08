import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  if (!isOpen) return null

  const colorMap = {
    danger: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    warning: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  }

  const btnMap = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-[var(--bg-secondary)] rounded-xl shadow-2xl border border-[var(--border)] p-6 animate-fade-in">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${colorMap[variant]}`}>
          <ExclamationTriangleIcon className="w-6 h-6" />
        </div>
        <h3 className="text-center font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-center text-sm text-[var(--text-secondary)] mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${btnMap[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
