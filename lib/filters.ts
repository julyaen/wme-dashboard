import type { Trade } from '@/types'
import type { FilterState } from '@/types/filters'

function bandPos(val: unknown): 'Above' | 'Below' {
  return String(val ?? '').startsWith('Above') ? 'Above' : 'Below'
}

export function applyFilters(trades: Trade[], f: FilterState): Trade[] {
  return trades.filter(t => {

    // ── Group 1: Setup ─────────────────────────────────────────────────────
    if (f.setups.length > 0 && !f.setups.includes(t.Setup)) return false
    if (f.tradeType !== 'All' && t['Trade Type'] !== f.tradeType) return false
    if (f.dateFrom && t['Entry DateTime'].slice(0,10) < f.dateFrom) return false
    if (f.dateTo   && t['Entry DateTime'].slice(0,10) > f.dateTo)   return false

    // ── Group 2: Wave states ───────────────────────────────────────────────
    if (f.wave2k  !== 'Both' && t.market['2kWave']  !== f.wave2k)  return false
    if (f.wave2m  !== 'Both' && t.market['2mWave']  !== f.wave2m)  return false
    if (f.wave30m !== 'Both' && t.market['30mWave'] !== f.wave30m) return false
    if (f.wave30s !== 'Both' && t.market['30sWave'] !== f.wave30s) return false

    // Entry position vs bands
    if (f.entryVwap !== 'Both' && bandPos(t['Entry >VWAP']) !== f.entryVwap) return false
    if (f.entryTB1  !== 'Both' && bandPos(t['Entry >TB1'])  !== f.entryTB1)  return false
    if (f.entryTB2  !== 'Both' && bandPos(t['Entry >TB2'])  !== f.entryTB2)  return false
    if (f.entryTB3  !== 'Both' && bandPos(t['Entry >TB3'])  !== f.entryTB3)  return false
    if (f.entryBB1  !== 'Both' && bandPos(t['Entry <BB1'])  !== f.entryBB1)  return false
    if (f.entryBB2  !== 'Both' && bandPos(t['Entry <BB2'])  !== f.entryBB2)  return false
    if (f.entryBB3  !== 'Both' && bandPos(t['Entry <BB3'])  !== f.entryBB3)  return false

    // ── Group 3: Volume / pressure ─────────────────────────────────────────
    if (f.ask1050 !== 'Both') {
      const val = t.market['ASK>1050'] === 1
      if (f.ask1050 === 'Yes' && !val) return false
      if (f.ask1050 === 'No'  &&  val) return false
    }
    if (f.bid950 !== 'Both') {
      const val = t.market['BID<950'] === 1
      if (f.bid950 === 'Yes' && !val) return false
      if (f.bid950 === 'No'  &&  val) return false
    }

    // Raw volume imbalance slider
    // rawImbalance < 0 → filter ASK dominant: RawASK-BID >= abs(rawImbalance)
    // rawImbalance > 0 → filter BID dominant: RawASK-BID <= -rawImbalance
    // rawImbalance = 0 → no filter
    if (f.rawImbalance < 0) {
      if (t.market['RawASK-BID'] < Math.abs(f.rawImbalance)) return false
    } else if (f.rawImbalance > 0) {
      if (t.market['RawASK-BID'] > -f.rawImbalance) return false
    }

    // ── Group 4: Numeric ranges ────────────────────────────────────────────
    const delta = t.market['Delta%']
    if (delta < f.deltaMin || delta > f.deltaMax) return false

    const e8k = t.market.E8_2kCL
    if (e8k < f.e8kMin || e8k > f.e8kMax) return false

    const e8m = t.market.E8_2mCL
    if (e8m < f.e8mMin || e8m > f.e8mMax) return false

    const bull = t.market.BullishDSS
    if (bull < f.bullDSSMin || bull > f.bullDSSMax) return false

    const bear = t.market.BearishDSS
    if (bear < f.bearDSSMin || bear > f.bearDSSMax) return false

    // ── Group 5: Time buckets ─────────────────────────────────────────────
    if (f.timeBuckets.length > 0 && !f.timeBuckets.includes(t.market['Time Bucket'])) return false

    return true
  })
}
