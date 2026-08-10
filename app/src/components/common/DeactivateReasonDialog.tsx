import React, { useState, useEffect, useId, useRef } from 'react'
import { NoSymbolIcon } from '@heroicons/react/24/outline'
import { useFocusTrap } from '@/hooks'

interface DeactivateReasonDialogProps {
  isOpen: boolean
  title?: string
  itemLabel: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

const DeactivateReasonDialog: React.FC<DeactivateReasonDialogProps> = ({
  isOpen,
  title = 'Deactivate',
  itemLabel,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const reasonId = useId()

  // The textarea is focused explicitly below, so the trap must not steal it.
  useFocusTrap(isOpen, dialogRef, false)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!reason.trim()) return
    onConfirm(reason.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm bg-[var(--bg-secondary)] rounded-xl shadow-2xl border border-[var(--border)] p-6 animate-fade-in"
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto text-red-500 bg-red-50 dark:bg-red-900/20">
          <NoSymbolIcon className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 id={titleId} className="text-center font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
        <p className="text-center text-sm text-[var(--text-secondary)] mb-4">{itemLabel}</p>
        <div className="mb-5">
          <label htmlFor={reasonId} className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Reason for Deactivation <span className="text-red-500">*</span>
          </label>
          <textarea
            id={reasonId}
            ref={textareaRef}
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            required
            aria-required="true"
            placeholder="Enter reason…"
            className="form-input w-full resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeactivateReasonDialog
