import React from 'react'

interface PageBreadcrumbProps {
  /** Parent module, e.g. "Master Management" */
  parent: string
  /** Current page name, shown highlighted */
  current: string
  /** Spacing override — pages use mb-4 by default, a few use mb-5 or none */
  className?: string
}

/**
 * Compact module / page trail used at the top of every list and form page.
 * Static by design: the tab system means a page is not always reached through
 * its parent, so the trail labels the location rather than linking to it.
 */
const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({ parent, current, className = 'mb-4' }) => (
  <nav
    aria-label="Breadcrumb"
    className={`flex items-center gap-2 text-xs ${className}`.trim()}
    style={{ color: 'var(--text-muted)' }}
  >
    <span>{parent}</span>
    <span aria-hidden="true">/</span>
    <span aria-current="page" style={{ color: 'var(--accent-gold)' }}>
      {current}
    </span>
  </nav>
)

export default PageBreadcrumb
