export type WaveFilter = 'Both' | 'Green' | 'Red'
export type BinaryFilter = 'Both' | 'Yes' | 'No'
export type VwapFilter = 'Both' | 'Above' | 'Below'
export type FilterScope = 'global' | 'local'

export interface FilterRanges {
  deltaMin: number; deltaMax: number
  e8kMin: number;   e8kMax: number
  e8mMin: number;   e8mMax: number
  bullMin: number;  bullMax: number
  bearMin: number;  bearMax: number
  rawMin: number;   rawMax: number
}

export interface FilterState {
  // Group 1 — Setup
  setups: string[]
  tradeType: 'All' | 'Long' | 'Short'
  dateFrom: string
  dateTo: string

  // Group 2 — Market structure
  wave2k: WaveFilter
  wave2m: WaveFilter
  wave30m: WaveFilter
  wave30s: WaveFilter
  entryVwap: VwapFilter
  entryTB1: VwapFilter
  entryTB2: VwapFilter
  entryTB3: VwapFilter
  entryBB1: VwapFilter
  entryBB2: VwapFilter
  entryBB3: VwapFilter

  // Group 3 — Volume pressure (imbalance slider only)
  rawImbalance: number

  // Group 4 — Numeric ranges (always set to full data range by default)
  deltaMin: number; deltaMax: number
  e8kMin: number;   e8kMax: number
  e8mMin: number;   e8mMax: number
  bullDSSMin: number; bullDSSMax: number
  bearDSSMin: number; bearDSSMax: number

  // Group 5 — Time
  timeBuckets: string[]
}

// Static defaults — ranges overridden dynamically after data loads
export const DEFAULT_FILTERS: FilterState = {
  setups: [],
  tradeType: 'All',
  dateFrom: '', dateTo: '',
  wave2k: 'Both', wave2m: 'Both', wave30m: 'Both', wave30s: 'Both',
  entryVwap: 'Both', entryTB1: 'Both', entryTB2: 'Both',
  entryTB3: 'Both', entryBB1: 'Both', entryBB2: 'Both', entryBB3: 'Both',
  rawImbalance: 0,
  deltaMin: -1,    deltaMax: 1,
  e8kMin: -200,    e8kMax: 200,
  e8mMin: -200,    e8mMax: 200,
  bullDSSMin: 0,   bullDSSMax: 100,
  bearDSSMin: 0,   bearDSSMax: 100,
  timeBuckets: [],
}

export function isDefaultFilters(f: FilterState, ranges: FilterRanges): boolean {
  return (
    f.setups.length === 0 &&
    f.tradeType === 'All' &&
    f.dateFrom === '' && f.dateTo === '' &&
    f.wave2k === 'Both' && f.wave2m === 'Both' &&
    f.wave30m === 'Both' && f.wave30s === 'Both' &&
    f.entryVwap === 'Both' && f.entryTB1 === 'Both' &&
    f.entryTB2 === 'Both' && f.entryTB3 === 'Both' &&
    f.entryBB1 === 'Both' && f.entryBB2 === 'Both' && f.entryBB3 === 'Both' &&
    f.rawImbalance === 0 &&
    f.deltaMin === ranges.deltaMin && f.deltaMax === ranges.deltaMax &&
    f.e8kMin === ranges.e8kMin && f.e8kMax === ranges.e8kMax &&
    f.e8mMin === ranges.e8mMin && f.e8mMax === ranges.e8mMax &&
    f.bullDSSMin === ranges.bullMin && f.bullDSSMax === ranges.bullMax &&
    f.bearDSSMin === ranges.bearMin && f.bearDSSMax === ranges.bearMax &&
    f.timeBuckets.length === 0
  )
}
