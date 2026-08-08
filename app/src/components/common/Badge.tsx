import React from 'react'

interface BadgeProps {
  label: string
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'gold'
  size?: 'sm' | 'md'
}

const variantMap = {
  primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border)]',
  gold: 'bg-[var(--color-gold)]/10 text-[var(--color-gold)] border-[var(--color-gold)]/20',
}

const autoVariant = (label: string): NonNullable<BadgeProps['variant']> => {
  const map: Record<string, BadgeProps['variant']> = {
    ACTIVE: 'success', INACTIVE: 'danger',
    PENDING: 'warning', CONFIRMED: 'primary', PROCESSING: 'info',
    DELIVERED: 'success', CANCELLED: 'danger',
    CUSTOMER: 'primary', SUPPLIER: 'info', BOTH: 'gold',
    TRUE: 'success', FALSE: 'danger',
  }
  return map[label?.toUpperCase()] || 'secondary'
}

const Badge: React.FC<BadgeProps> = ({ label, variant, size = 'sm' }) => {
  const v = variant || autoVariant(label)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${variantMap[v!]}`}
    >
      {label}
    </span>
  )
}

export default Badge
