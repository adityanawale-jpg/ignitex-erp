import React, { useEffect, useId, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useFocusTrap } from '@/hooks'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  footer?: React.ReactNode
}

const sizeMap = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  footer,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useFocusTrap(isOpen, dialogRef)

  if (!isOpen) return null

  return (
    <div
      className="fixed z-[200] flex items-center justify-center p-4"
      style={{ inset: 0, overflowY: 'auto' }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: -1 }}
        onClick={onClose}
      />
      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${sizeMap[size]} rounded-xl shadow-2xl border border-[var(--border-color)] animate-fade-in flex flex-col max-h-[90vh] mx-auto`}
        style={{ background: 'var(--bg-modal)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0 rounded-t-xl"
          style={{ background: 'var(--bg-modal-header)', borderBottom: '1px solid var(--border-color)' }}
        >
          <h2 id={titleId} className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 flex-shrink-0 flex justify-end gap-3 rounded-b-xl"
            style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-modal-footer)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
