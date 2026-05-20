'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { usePathname } from 'next/navigation'

const SELECT_STYLE: React.CSSProperties = {
  fontSize: 11, padding: '3px 6px', borderRadius: 5,
  background: 'var(--bg2)', border: '1px solid var(--border2)',
  color: 'var(--t2)', cursor: 'pointer', outline: 'none',
}

const PAGE_LABELS: Record<string, string> = {
  '/':          'Dashboard',
  '/journal':   'Journal',
  '/analytics': 'Analytics',
  '/playbook':  'Playbook',
  '/calendar':  'Calendar',
  '/import':    'Import',
  '/settings':  'Settings',
}

export default function Topbar() {
  const {
    filterOpen, setFilterOpen, activeFilterCount, activeFilters,
    filteredTrades, trades, fileName, isFiltered,
    accounts, scope, globalFilters, setGlobalFilters, localFilters, setLocalFilters,
  } = useStore()
  const path = usePathname()
  const pageLabel = PAGE_LABELS[path] ?? ''

  function setFilter(update: Partial<typeof activeFilters>) {
    if (scope === 'global') setGlobalFilters({ ...globalFilters, ...update })
    else setLocalFilters({ ...localFilters, ...update })
  }

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


      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Account selector */}
        {accounts.length > 1 && (
          <select
            value={activeFilters.account}
            onChange={e => setFilter({ account: e.target.value })}
            style={{
              ...SELECT_STYLE,
              borderColor: activeFilters.account ? 'rgba(59,130,246,0.4)' : 'var(--border2)',
              color: activeFilters.account ? 'var(--blue)' : 'var(--t2)',
            }}
          >
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {/* Session selector */}
        {trades.length > 0 && (
          <select
            value={activeFilters.session}
            onChange={e => setFilter({ session: e.target.value as 'All' | 'AM' | 'PM' })}
            style={{
              ...SELECT_STYLE,
              borderColor: activeFilters.session !== 'All' ? 'rgba(59,130,246,0.4)' : 'var(--border2)',
              color: activeFilters.session !== 'All' ? 'var(--blue)' : 'var(--t2)',
            }}
          >
            <option value="All">All sessions</option>
            <option value="AM">AM session</option>
            <option value="PM">PM session</option>
          </select>
        )}

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
            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.span
                  key={activeFilterCount}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  style={{
                    background: 'var(--blue)', color: '#fff',
                    borderRadius: '50%', width: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                  }}
                >
                  {activeFilterCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>
    </div>
  )
}
