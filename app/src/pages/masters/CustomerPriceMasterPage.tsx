import React, { useState } from 'react'
import { CubeIcon, SparklesIcon } from '@heroicons/react/24/outline'
import CustomerPriceMetalTab from './customerPrice/CustomerPriceMetalTab'
import CustomerPriceStoneTab from './customerPrice/CustomerPriceStoneTab'

type TabId = 'METAL' | 'STONE'

const TABS: { id: TabId; label: string; icon: React.ReactElement }[] = [
  { id: 'METAL', label: 'Metal',  icon: <CubeIcon className="w-4 h-4" /> },
  { id: 'STONE', label: 'Stone',  icon: <SparklesIcon className="w-4 h-4" /> },
]

const CustomerPriceMasterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('METAL')
  // A tab's entry form is a full page, not a popup — while one is open the
  // breadcrumb and tab bar step aside so the form owns the screen, and the form
  // renders its own breadcrumb back to this list.
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div>
      {!formOpen && (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            <span>Masters</span>
            <span>/</span>
            <span style={{ color: 'var(--accent-gold)' }}>Customer Price Master</span>
          </div>

          {/* Tab bar */}
          <div className="flex border-b mb-5" style={{ borderColor: 'var(--border-color)' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === t.id ? 'border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-transparent hover:text-[var(--text-secondary)]'
                }`}
                style={{ color: activeTab === t.id ? 'var(--accent-gold)' : 'var(--text-muted)' }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {activeTab === 'METAL'
        ? <CustomerPriceMetalTab onFormOpen={setFormOpen} />
        : <CustomerPriceStoneTab onFormOpen={setFormOpen} />}
    </div>
  )
}

export default CustomerPriceMasterPage
