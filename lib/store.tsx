'use client'
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { Trade, DashboardStats } from '@/types'
import type { FilterState, FilterScope, FilterRanges } from '@/types/filters'
import { DEFAULT_FILTERS, isDefaultFilters } from '@/types/filters'
import { parseXLSX, computeStats, computeRanges } from '@/lib/parser'
import { normalizeFromRaw } from '@/lib/normalizer'
import type { NormalizeResult } from '@/lib/normalizer'
import { applyFilters } from '@/lib/filters'

function makeDefaultFilters(r: FilterRanges): FilterState {
  return {
    ...DEFAULT_FILTERS,
    deltaMin: r.deltaMin, deltaMax: r.deltaMax,
    e8kMin: r.e8kMin,     e8kMax: r.e8kMax,
    e8mMin: r.e8mMin,     e8mMax: r.e8mMax,
    bullDSSMin: r.bullMin,       bullDSSMax: r.bullMax,
    bearDSSMin: r.bearMin,       bearDSSMax: r.bearMax,
    wcl2k2mMin: r.wcl2k2mMin,   wcl2k2mMax: r.wcl2k2mMax,
  }
}

const EMPTY_RANGES: FilterRanges = {
  deltaMin: -1,    deltaMax: 1,
  e8kMin: -200,    e8kMax: 200,
  e8mMin: -200,    e8mMax: 200,
  bullMin: 0,      bullMax: 100,
  bearMin: 0,      bearMax: 100,
  rawMin: -800,    rawMax: 800,
  dwMin: -105,     dwMax: 105,
  rawDWMin: -105,  rawDWMax: 105,
  wcl2k2mMin: -200, wcl2k2mMax: 200,
}

interface StoreState {
  trades: Trade[]
  accounts: string[]
  fileName: string
  loading: boolean
  error: string | null
  loadFile: (buffer: ArrayBuffer, name: string) => void
  loadFromRaw: (marketBuffer: ArrayBuffer, tradeBuffer: ArrayBuffer, name: string) => void
  clearData: () => void
  ranges: FilterRanges
  scope: FilterScope
  setScope: (s: FilterScope) => void
  globalFilters: FilterState
  setGlobalFilters: (f: FilterState) => void
  localFilters: FilterState
  setLocalFilters: (f: FilterState) => void
  resetGlobalFilters: () => void
  resetLocalFilters: () => void
  filterOpen: boolean
  setFilterOpen: (v: boolean) => void
  filteredTrades: Trade[]
  stats: DashboardStats | null
  activeFilters: FilterState
  activeFilterCount: number
  isFiltered: boolean
  tagIndex: Record<string, string[]>
  setTradeTag: (tradeId: string, tags: string[]) => void
}

const StoreCtx = createContext<StoreState | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades]     = useState<Trade[]>([])
  const accounts = useMemo(
    () => Array.from(new Set(trades.map(t => t.Account).filter(Boolean))).sort(),
    [trades]
  )
  const [fileName, setFileName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [ranges, setRanges]     = useState<FilterRanges>(EMPTY_RANGES)
  const [scope, setScope_]      = useState<FilterScope>('global')
  const [globalFilters, setGlobalFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [localFilters,  setLocalFilters]  = useState<FilterState>(DEFAULT_FILTERS)
  const [filterOpen, setFilterOpen]       = useState(false)
  const [tagIndex,   setTagIndex]         = useState<Record<string, string[]>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem('wme_tags')
      if (stored) setTagIndex(JSON.parse(stored))
    } catch {}
  }, [])

  const setTradeTag = useCallback((tradeId: string, tags: string[]) => {
    setTagIndex(prev => {
      const next = { ...prev }
      if (tags.length === 0) delete next[tradeId]
      else next[tradeId] = tags
      localStorage.setItem('wme_tags', JSON.stringify(next))
      return next
    })
  }, [])

  const setScope = useCallback((s: FilterScope) => {
    setScope_(s)
    // reset local filters on switch to local
    if (s === 'local') setLocalFilters(f => makeDefaultFilters(ranges))
  }, [ranges])

  const resetGlobalFilters = useCallback(() =>
    setGlobalFilters(makeDefaultFilters(ranges)), [ranges])
  const resetLocalFilters = useCallback(() =>
    setLocalFilters(makeDefaultFilters(ranges)), [ranges])

  const loadFile = useCallback((buffer: ArrayBuffer, name: string) => {
    setLoading(true)
    setError(null)
    try {
      const parsed = parseXLSX(buffer)
      const r = computeRanges(parsed)
      const defaults = makeDefaultFilters(r)
      setTrades(parsed)
      setRanges(r)
      setFileName(name)
      setGlobalFilters(defaults)
      setLocalFilters(defaults)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse error')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFromRaw = useCallback((marketBuffer: ArrayBuffer, tradeBuffer: ArrayBuffer, name: string) => {
    setLoading(true)
    setError(null)
    try {
      const { trades: parsed, warnings }: NormalizeResult = normalizeFromRaw(marketBuffer, tradeBuffer)
      const r        = computeRanges(parsed)
      const defaults = makeDefaultFilters(r)
      setTrades(parsed)
      setRanges(r)
      setFileName(name)
      setGlobalFilters(defaults)
      setLocalFilters(defaults)
      if (warnings.length) setError(warnings.join('\n'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Normalizer error')
    } finally {
      setLoading(false)
    }
  }, [])

  const clearData = useCallback(() => {
    setTrades([])
    setFileName('')
    setError(null)
    setRanges(EMPTY_RANGES)
    setGlobalFilters(DEFAULT_FILTERS)
    setLocalFilters(DEFAULT_FILTERS)
  }, [])

  const activeFilters = scope === 'global' ? globalFilters : localFilters

  const filteredTrades = useMemo(() => {
    const base = applyFilters(trades, activeFilters)
    if (activeFilters.activeTags.length === 0) return base
    return base.filter(t => {
      const tradeTags = tagIndex[t.id] ?? []
      return activeFilters.activeTags.some(tag => tradeTags.includes(tag))
    })
  }, [trades, activeFilters, tagIndex])

  const stats = useMemo(
    () => filteredTrades.length > 0 ? computeStats(filteredTrades) : null,
    [filteredTrades]
  )

  const activeFilterCount = useMemo(() => {
    const f = activeFilters
    const r = ranges
    let n = 0
    if (f.account) n++
    if (f.session !== 'All') n++
    if (f.setups.length > 0) n++
    if (f.tradeType !== 'All') n++
    if (f.dateFrom || f.dateTo) n++
    if (f.wave2k !== 'Both' || f.wave2m !== 'Both' ||
        f.wave30m !== 'Both' || f.wave30s !== 'Both') n++
    if (f.entryVwap !== 'Both' || f.entryTB1 !== 'Both' ||
        f.entryTB2 !== 'Both' || f.entryTB3 !== 'Both' ||
        f.entryBB1 !== 'Both' || f.entryBB2 !== 'Both' ||
        f.entryBB3 !== 'Both') n++
    if (f.rawImbalance !== 0) n++
    if (f.dwSkew !== 0) n++
    if (f.rawDW !== 0) n++
    if (f.deltaMin !== r.deltaMin    || f.deltaMax !== r.deltaMax    ||
        f.e8kMin !== r.e8kMin        || f.e8kMax !== r.e8kMax        ||
        f.e8mMin !== r.e8mMin        || f.e8mMax !== r.e8mMax        ||
        f.bullDSSMin !== r.bullMin   || f.bullDSSMax !== r.bullMax   ||
        f.bearDSSMin !== r.bearMin   || f.bearDSSMax !== r.bearMax   ||
        f.wcl2k2mMin !== r.wcl2k2mMin || f.wcl2k2mMax !== r.wcl2k2mMax) n++
    if (f.timeBuckets.length > 0) n++
    if (f.activeTags.length > 0) n++
    return n
  }, [activeFilters, ranges])

  const isFiltered = !isDefaultFilters(activeFilters, ranges)

  return (
    <StoreCtx.Provider value={{
      trades, accounts, fileName, loading, error, loadFile, loadFromRaw, clearData,
      ranges,
      scope, setScope,
      globalFilters, setGlobalFilters,
      localFilters, setLocalFilters,
      resetGlobalFilters, resetLocalFilters,
      filterOpen, setFilterOpen,
      filteredTrades, stats, activeFilters,
      activeFilterCount, isFiltered,
      tagIndex, setTradeTag,
    }}>
      {children}
    </StoreCtx.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be inside StoreProvider')
  return ctx
}
