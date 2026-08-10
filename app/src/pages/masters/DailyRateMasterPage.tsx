import React, { useState } from 'react'
import { CalendarDaysIcon, BoltIcon } from '@heroicons/react/24/outline'
import DailyRateSheetTab  from './dailyRate/DailyRateSheetTab'
import DailyRateConfigTab from './dailyRate/DailyRateConfigTab'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'

type TabId = 'SHEETS' | 'AUTO'

const TABS: { id: TabId; label: string; icon: React.ReactElement }[] = [
  { id: 'SHEETS', label: 'Rate Sheets', icon: <CalendarDaysIcon className="w-4 h-4" /> },
  { id: 'AUTO',   label: 'Auto Update', icon: <BoltIcon         className="w-4 h-4" /> },
]

// Master Management → Daily Rate. The day's metal rates in ₹ per gram, which
// Sales Order strikes its percentage-based customer prices against.
const DailyRateMasterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('SHEETS')
  // Saving on the Auto Update tab can write a rate sheet, so the sheet grid is
  // told to refresh rather than showing yesterday's list until a manual reload.
  const [sheetsStamp, setSheetsStamp] = useState(0)

  return (
    <div>
      <PageBreadcrumb parent="Masters" current="Daily Rate" />

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

      {/* Both tabs stay mounted: the config tab holds an unsaved form, and
          losing it to a tab switch would be its own small betrayal. */}
      <div style={{ display: activeTab === 'SHEETS' ? 'block' : 'none' }}>
        <DailyRateSheetTab refreshKey={sheetsStamp} />
      </div>
      <div style={{ display: activeTab === 'AUTO' ? 'block' : 'none' }}>
        <DailyRateConfigTab onRatesChanged={() => setSheetsStamp(s => s + 1)} />
      </div>
    </div>
  )
}

export default DailyRateMasterPage
