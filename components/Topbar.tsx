'use client'
import { useStore } from '@/lib/store'
import { usePathname } from 'next/navigation'
import type { FilterState } from '@/types/filters'
import { DEFAULT_FILTERS } from '@/types/filters'

const PAGE_LABELS: Record<string, string> = {
  '/':          'Dashboard',
  '/journal':   'Journal',
  '/analytics': 'Analytics',
  '/playbook':  'Playbook',
  '/calendar':  'Calendar',
  '/import':    'Import',
  '/settings':  'Settings',
}

function ActiveBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 6px', borderRadius: 3,
      background: 'rgba(59,130,246,0.15)',
      border: '1px solid rgba(59,130,246,0.25)',
      color: 'var(--blue)',
    }}>{label}</span>
  )
}

export default function Topbar() {
  const { filterOpen, setFilterOpen, activeFilterCount, activeFilters, filteredTrades, trades, fileName, scope, isFiltered } = useStore()
  const path = usePathname()
  const pageLabel = PAGE_LABELS[path] ?? ''

  // Build short summary of what's active
  const activeSummary: string[] = []
  const f = activeFilters
  if (f.setups.length > 0) activeSummary.push(f.setups.join(', '))
  if (f.tradeType !== 'All') activeSummary.push(f.tradeType)
  if (f.wave2k !== 'Both') activeSummary.push(`2k:${f.wave2k}`)
  if (f.wave2m !== 'Both') activeSummary.push(`2m:${f.wave2m}`)
  if (f.wave30m !== 'Both') activeSummary.push(`30m:${f.wave30m}`)
  if (f.wave30s !== 'Both') activeSummary.push(`30s:${f.wave30s}`)
  if (f.entryVwap !== 'Both') activeSummary.push(`VWAP:${f.entryVwap}`)
  if (f.entryTB1  !== 'Both') activeSummary.push(`TB1:${f.entryTB1}`)
  if (f.entryTB2  !== 'Both') activeSummary.push(`TB2:${f.entryTB2}`)
  if (f.entryTB3  !== 'Both') activeSummary.push(`TB3:${f.entryTB3}`)
  if (f.entryBB1  !== 'Both') activeSummary.push(`BB1:${f.entryBB1}`)
  if (f.ask1050 !== 'Both') activeSummary.push(`ASK>1050:${f.ask1050}`)
  if (f.bid950 !== 'Both') activeSummary.push(`BID<950:${f.bid950}`)
  if (f.rawImbalance !== 0) activeSummary.push(`Imbal:${f.rawImbalance > 0 ? 'BID' : 'ASK'}${Math.abs(f.rawImbalance)}`)
  if (f.timeBuckets.length > 0) activeSummary.push(f.timeBuckets.join('/'))
  if (f.deltaMin !== DEFAULT_FILTERS.deltaMin || f.deltaMax !== DEFAULT_FILTERS.deltaMax)
    activeSummary.push(`Δ${(f.deltaMin*100).toFixed(0)}%→${(f.deltaMax*100).toFixed(0)}%`)
  if (f.e8mMin !== DEFAULT_FILTERS.e8mMin || f.e8mMax !== DEFAULT_FILTERS.e8mMax)
    activeSummary.push(`E8m:${f.e8mMin}→${f.e8mMax}`)
  if (f.bullDSSMin !== DEFAULT_FILTERS.bullDSSMin || f.bullDSSMax !== DEFAULT_FILTERS.bullDSSMax)
    activeSummary.push(`BullDSS:${f.bullDSSMin}-${f.bullDSSMax}`)
  if (f.bearDSSMin !== DEFAULT_FILTERS.bearDSSMin || f.bearDSSMax !== DEFAULT_FILTERS.bearDSSMax)
    activeSummary.push(`BearDSS:${f.bearDSSMin}-${f.bearDSSMax}`)

  return (
    <div style={{
      height: 42,
      background: 'var(--bg1)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 10,
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      {/* Page title */}
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', flexShrink: 0 }}>
        {pageLabel}
      </span>

      {/* Active filter badges — scrollable row */}
      {activeSummary.length > 0 && (
        <div style={{ display: 'flex', gap: 4, overflow: 'hidden', flex: 1 }}>
          <span style={{ fontSize: 9, color: 'var(--t3)', alignSelf: 'center', flexShrink: 0 }}>
            {scope === 'global' ? '🌐' : '📄'}
          </span>
          {activeSummary.slice(0, 6).map(l => <ActiveBadge key={l} label={l} />)}
          {activeSummary.length > 6 && (
            <span style={{ fontSize: 9, color: 'var(--t3)', alignSelf: 'center' }}>
              +{activeSummary.length - 6} more
            </span>
          )}
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Trade count */}
        {trades.length > 0 && (
          <span style={{ fontSize: 10, color: isFiltered ? 'var(--blue)' : 'var(--t3)' }}>
            {isFiltered ? `${filteredTrades.length} / ${trades.length}` : `${trades.length}`} trades
          </span>
        )}

        {/* File name */}
        {fileName && (
          <span style={{
            fontSize: 9, color: 'var(--t3)',
            maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{fileName}</span>
        )}

        {/* Filter button */}
        {trades.length > 0 && (
          <button onClick={() => setFilterOpen(!filterOpen)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 6, fontSize: 11,
            border: '1px solid',
            borderColor: activeFilterCount > 0 ? 'rgba(59,130,246,0.4)' : 'var(--border2)',
            background: activeFilterCount > 0 ? 'rgba(59,130,246,0.12)' : 'var(--bg2)',
            color: activeFilterCount > 0 ? 'var(--blue)' : 'var(--t2)',
            cursor: 'pointer', transition: 'all .15s',
          }}>
            ⊟ Filters
            {activeFilterCount > 0 && (
              <span style={{
                background: 'var(--blue)', color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
              }}>{activeFilterCount}</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
