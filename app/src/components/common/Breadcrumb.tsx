import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
}

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  masters: 'Masters',
  party: 'Party Master',
  product: 'Product Master',
  metal: 'Metal Master',
  category: 'Category Master',
  lookup: 'Lookup Master',
  inventory: 'Inventory',
  'stock-entry': 'Stock Entry',
  'stock-ledger': 'Stock Ledger',
  'stock-report': 'Stock Report',
  sales: 'Sales',
  orders: 'Orders',
  invoice: 'Invoice',
  return: 'Return',
  purchase: 'Purchase',
  accounts: 'Accounts',
  payment: 'Payment Entry',
  receipt: 'Receipt Entry',
  ledger: 'Ledger Report',
  reports: 'Reports',
  settings: 'Settings',
  users: 'User Management',
  roles: 'Role Management',
  config: 'System Config',
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const location = useLocation()

  const autoItems = React.useMemo<BreadcrumbItem[]>(() => {
    if (items) return items
    const parts = location.pathname.split('/').filter(Boolean)
    return parts.map((part, idx) => ({
      label: routeLabels[part] || part.charAt(0).toUpperCase() + part.slice(1),
      path: idx < parts.length - 1 ? '/' + parts.slice(0, idx + 1).join('/') : undefined,
    }))
  }, [items, location.pathname])

  if (autoItems.length === 0) return null

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-4">
      <Link to="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors">
        <HomeIcon className="w-4 h-4" />
      </Link>
      {autoItems.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          {item.path ? (
            <Link
              to={item.path}
              className="text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--text-primary)] font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default Breadcrumb
