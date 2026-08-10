// ============================================================
// ROYAL CHAIN - Utility Functions
// ============================================================

/**
 * Format currency in Indian Rupees
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount == null) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date to dd/mm/yyyy
 */
export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '-'
  }
}

/**
 * Format date-time
 */
export const formatDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  } catch {
    return '-'
  }
}

/**
 * Format weight in grams
 */
export const formatWeight = (weight: number | undefined | null): string => {
  if (weight == null) return '0.000 g'
  return `${weight.toFixed(3)} g`
}

/**
 * Generate document number prefix
 */
export const generateDocNo = (prefix: string): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${year}${month}-${random}`
}

/**
 * Truncate string
 */
export const truncate = (str: string, len = 30): string => {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Convert file to base64
 */
export const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })

/**
 * Status badge color helper
 */
export const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-primary',
    PROCESSING: 'badge-info',
    DELIVERED: 'badge-success',
    CANCELLED: 'badge-danger',
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-danger',
    CUSTOMER: 'badge-primary',
    SUPPLIER: 'badge-secondary',
    BOTH: 'badge-info',
  }
  return map[status?.toUpperCase()] || 'badge-secondary'
}

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))

/**
 * Check if value is empty
 */
export const isEmpty = (val: unknown): boolean => {
  if (val == null) return true
  if (typeof val === 'string') return val.trim() === ''
  if (Array.isArray(val)) return val.length === 0
  if (typeof val === 'object') return Object.keys(val).length === 0
  return false
}

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Get relative time
 */
export const timeAgo = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return formatDate(dateStr)
}

/**
 * Escape HTML special characters before interpolating a value into a markup string.
 * Use for any user or database supplied text in the print / Word export builders.
 */
export const escapeHtml = (value: string | undefined | null): string => {
  if (!value) return ''
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Same as escapeHtml, but keeps multi-line text readable by turning
 * newlines into line breaks. Use inside block elements, not attributes.
 */
export const escapeHtmlWithBreaks = (value: string | undefined | null): string =>
  escapeHtml(value).replace(/\n/g, '<br/>')

/**
 * Export data to CSV
 */
export const exportToCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export data to Excel (.xlsx)
 */
export const exportToExcel = async (data: Record<string, unknown>[], filename: string): Promise<void> => {
  if (!data.length) return
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export data to PDF
 */
export const exportToPDF = async (
  data: Record<string, unknown>[],
  filename: string,
  title?: string
): Promise<void> => {
  if (!data.length) return
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  if (title) {
    doc.setFontSize(14)
    doc.text(title, 14, 15)
  }
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => String(row[h] ?? '')))
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 22 : 10,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  })
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
}
