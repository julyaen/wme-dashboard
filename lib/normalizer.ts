import * as XLSX from 'xlsx'
import type { Trade, MarketBar } from '@/types'

// ─── Sierra Chart column renames ──────────────────────────────────────────────
// Covers both wme_fasterV2 (legacy) and EdgeBase format.
// EdgeBase uses new column names for the same concepts — remap them to the
// canonical names used throughout the analytics engine so downstream code
// never has to care which format was uploaded.
const SC_RENAME: Record<string, string> = {
  'Close': 'Last',
  // EdgeBase wave channel → canonical wave names
  'WaveTopLine':    '2kNL',
  'WaveBottomLine': '2kFL',
  'WaveDynamicLine':'EMA8',        // 2kEMA8
  'WaveBID':        'wBID',
  'WaveASK':        'wASK',
  // EdgeBase VWAP bands → canonical band names
  '1sigma':         'TB1',
  '-1sigma':        'BB1',
  '2sigma':         'TB2',
  '-2sigma':        'BB2',
  // EdgeBase IB levels → canonical names
  'IB_Hi':          'IBHigh',
  'IB_Lo':          'IBLow',
  // EdgeBase DW → canonical names
  'dwBID':          'DWbid',
  'dwASK':          'DWask',
  // EdgeBase 30m VP → canonical names
  '30mPOC':         'poc30m',
  '30mVAH':         'vah30m',
  '30mVAL':         'val30m',
}

// ─── Columns to drop entirely from market data ────────────────────────────────
// "Not Relevant" per wme_normalized_column_names.xlsx + obsolete threshold flags
const DROP_COLUMNS = new Set([
  'RedBarBlueBar', 'CPL', 'LRH', 'LRL',
  'Delta%txt', 'E8.CL', 'BearDSStxt', 'BullDSStxt',
  'E8_2mCLtxt', 'Text Display', 'CountDown',
  'biDSS>50', 'biDSS>70', 'asDSS>50', 'asDSS>70',
])

type RawRow = Record<string, string | number>

// ─── CSV parser (handles quoted fields) ───────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

// ─── Parse wme_fasterV2.txt ───────────────────────────────────────────────────
function parseTxt(buffer: ArrayBuffer): RawRow[] {
  const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer))
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('Market data file appears empty or has no data rows.')

  const headers = parseCSVLine(lines[0]).map(h => {
    const trimmed = h.trim()
    return SC_RENAME[trimmed] ?? trimmed
  })

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row: RawRow = {}
    headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? '' })
    return row
  }).filter(r => r['Date'] && String(r['Date']).trim() !== '')
}

// ─── Numeric coercion ─────────────────────────────────────────────────────────
const n = (v: string | number | undefined | null): number => {
  if (v === undefined || v === null || v === '') return 0
  const parsed = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(parsed) ? 0 : parsed
}

// ─── Date normalizer — handles YYYY/MM/DD, MM/DD/YYYY, YYYY-MM-DD ────────────
function normalizeDateStr(raw: string): string {
  const s = raw.trim()
  if (!s) return ''

  // YYYY/MM/DD or YYYY-MM-DD
  const isoLike = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (isoLike) {
    const [, y, m, d] = isoLike
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }

  // MM/DD/YYYY
  const usFormat = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usFormat) {
    const [, m, d, y] = usFormat
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }

  // Fallback: try JS Date
  const dt = new Date(s)
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)

  return s.slice(0, 10)
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
function formatTime(raw: string): string {
  const t = raw.trim().split('.')[0]
  const parts = t.split(':')
  if (parts.length >= 3)
    return `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}:${parts[2].padStart(2,'0')}`
  return t
}

function getTimeBucket(raw: string): string {
  const t = raw.trim().split('.')[0]
  const parts = t.split(':')
  if (parts.length < 2) return '00:00'
  const h = parseInt(parts[0])
  const m = Math.floor(parseInt(parts[1]) / 15) * 15
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function timeStrToSeconds(raw: string): number {
  const t = raw.trim().split('.')[0]
  const parts = t.split(':')
  if (parts.length < 2) return 0
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + (parseInt(parts[2]) || 0)
}

function dtToSeconds(iso: string): number {
  if (!iso) return 0
  const d = new Date(iso)
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}

// ─── Compute all derived columns on a single bar row ─────────────────────────
function computeDerived(row: RawRow): RawRow {
  const r = { ...row }

  // Normalize date to YYYY-MM-DD regardless of Sierra Chart export format
  r['Date'] = normalizeDateStr(String(r['Date'] ?? ''))

  // Time
  const timeRaw = String(r['Time'] ?? '').trim()
  r['Time']        = formatTime(timeRaw)
  r['Time Bucket'] = getTimeBucket(timeRaw)

  // Volume flags
  const askVol = n(r['Ask Volume'])
  const bidVol = n(r['Bid Volume'])
  r['ASK>1050'] = askVol > 1050 ? 1 : 0
  r['BID<950']  = bidVol <  950 ? 1 : 0
  r['BID>1050'] = bidVol > 1050 ? 1 : 0
  r['ASK<950']  = askVol <  950 ? 1 : 0

  // Price averages
  const open = n(r['Open']), high = n(r['High']), low = n(r['Low']), last = n(r['Last'])
  r['OHLC Avg'] = (open + high + low + last) / 4
  r['HLC Avg']  = (high + low + last) / 3
  r['HL Avg']   = (high + low) / 2

  // Wave centre lines (always recompute — authoritative)
  r['30m CentreLine'] = (n(r['30mFL']) + n(r['30mNL'])) / 2
  r['2mCL']           = (n(r['2mFL'])  + n(r['2mNL']))  / 2

  // EdgeBase does not export VWAP directly — derive from symmetric bands.
  // TB1 (1sigma) and BB1 (-1sigma) are equidistant from VWAP by definition.
  if (!n(r['VWAP']) && n(r['TB1']) && n(r['BB1'])) {
    r['VWAP'] = (n(r['TB1']) + n(r['BB1'])) / 2
  }

  // EdgeBase does not have 2kWCL — approximate as midpoint of the wave channel.
  if (!n(r['2kWCL']) && (n(r['2kNL']) || n(r['2kFL']))) {
    r['2kWCL'] = (n(r['2kNL']) + n(r['2kFL'])) / 2
  }

  // VWAP midpoint
  r['vwap_TB1'] = (n(r['VWAP']) + n(r['TB1'])) / 2

  // Raw volume ratios
  r['RawAsk']     = askVol / 2000
  r['RawBid']     = bidVol / 2000
  r['RawASK-BID'] = askVol - bidVol

  // DeltaWave ratios (recompute from raw)
  r['DWbid']      = bidVol / 2000
  r['DWask']      = askVol / 2000
  r['Net DWSkew'] = n(r['DWask']) - n(r['DWbid'])

  // Pressure percentages
  const totalVol  = (bidVol + askVol) || 1
  r['BID%']   = bidVol / totalVol
  r['ASK%']   = askVol / totalVol
  r['Delta%'] = (askVol - bidVol) / totalVol

  // Wave ranges
  r['2000Vol Wave Range'] = n(r['2kNL']) - n(r['2kFL'])
  r['2m WaveRange']       = n(r['2mNL']) - n(r['2mFL'])

  // EMA8 distances (recompute — authoritative)
  const ema8  = n(r['EMA8'])
  const wcl2k = n(r['2kWCL'])
  const cl2m  = n(r['2mCL'])
  r['2kEMA8 vs 2kWCL'] = ema8 - wcl2k
  r['2kEMA8 vs 2mWCL'] = ema8 - cl2m
  r['2kWCL vs 2mWCL']  = wcl2k - cl2m
  r['E8_2kCL']         = ema8 - wcl2k
  r['E8_2mCL']         = ema8 - cl2m

  // Wave states — 2kWave always available (EdgeBase provides WaveTop/Bottom → 2kNL/2kFL)
  r['2kWave'] = n(r['2kNL']) > n(r['2kFL']) ? 'Green' : 'Red'
  // 2m/30m/30s only exist in the old wme_fasterV2 format; omit for EdgeBase data
  if (n(r['2mNL']) || n(r['2mFL']))   r['2mWave']  = n(r['2mNL'])  > n(r['2mFL'])  ? 'Green' : 'Red'
  if (n(r['30mNL']) || n(r['30mFL'])) r['30mWave'] = n(r['30mNL']) > n(r['30mFL']) ? 'Green' : 'Red'
  if (n(r['30sNL']) || n(r['30sFL'])) r['30sWave'] = n(r['30sNL']) > n(r['30sFL']) ? 'Green' : 'Red'

  // Price inside 2m Wave
  r['LowInside2mWave']  = (low  > n(r['2mFL']) && low  < n(r['2mNL'])) ? 1 : 0
  r['Highinside2mWave'] = (high > n(r['2mFL']) && high < n(r['2mNL'])) ? 1 : 0

  // Drop irrelevant columns
  for (const col of DROP_COLUMNS) delete r[col]

  return r
}

// ─── Parse TradeActivity.xlsx ─────────────────────────────────────────────────
function parseTrades(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[]
  return rows.map(r => {
    const cleaned: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r)) cleaned[k.trim()] = v
    return cleaned
  })
}

function findDateTimeCol(row: Record<string, unknown>): string | null {
  for (const c of ['Entry DateTime', 'EntryDateTime', 'Entry Date Time', 'Entry Date', 'DateTime'])
    if (c in row) return c
  return null
}

// Duration from TradeActivity may arrive as a Date object (xlsx cellDates:true converts
// time-formatted cells) or as a fractional-day number. Returns fractional days.
function parseDuration(val: unknown): number {
  if (val instanceof Date) {
    return (val.getUTCHours() * 3600 + val.getUTCMinutes() * 60 + val.getUTCSeconds()) / 86400
  }
  const n = Number(val ?? 0)
  return isNaN(n) ? 0 : n
}

function formatDt(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

// ─── Entry price vs VWAP / band levels ───────────────────────────────────────
function entryVsBands(ep: number, bar: RawRow): Record<string, string> {
  return {
    'Entry >VWAP': ep > n(bar['VWAP']) ? 'Above vwap' : 'Below vwap',
    'Entry >TB1':  ep > n(bar['TB1'])  ? 'Above TB1'  : 'Below TB1',
    'Entry >TB2':  ep > n(bar['TB2'])  ? 'Above TB2'  : 'Below TB2',
    'Entry >TB3':  ep > n(bar['TB3'])  ? 'Above TB3'  : 'Below TB3',
    'Entry <BB1':  ep < n(bar['BB1'])  ? 'Below BB1'  : 'Above BB1',
    'Entry <BB2':  ep < n(bar['BB2'])  ? 'Below BB2'  : 'Above BB2',
    'Entry <BB3':  ep < n(bar['BB3'])  ? 'Below BB3'  : 'Above BB3',
  }
}

// ─── Build a MarketBar from a computed bar row ────────────────────────────────
function toMarketBar(bar: RawRow): MarketBar {
  const wave = (k: string): 'Green' | 'Red' => bar[k] === 'Green' ? 'Green' : 'Red'
  const optWave = (k: string): 'Green' | 'Red' | undefined =>
    bar[k] === 'Green' ? 'Green' : bar[k] === 'Red' ? 'Red' : undefined

  return {
    Date:                  String(bar['Date'] ?? ''),
    Time:                  String(bar['Time'] ?? ''),
    'Time Bucket':         String(bar['Time Bucket'] ?? ''),
    Open:                  n(bar['Open']),
    High:                  n(bar['High']),
    Low:                   n(bar['Low']),
    Last:                  n(bar['Last']),
    Volume:                n(bar['Volume']),
    'Bid Volume':          n(bar['Bid Volume']),
    'Ask Volume':          n(bar['Ask Volume']),
    'ASK>1050':            n(bar['ASK>1050']),
    'BID<950':             n(bar['BID<950']),
    'BID>1050':            n(bar['BID>1050']),
    'ASK<950':             n(bar['ASK<950']),
    '2kFL':                n(bar['2kFL']),
    '2kNL':                n(bar['2kNL']),
    EMA8:                  n(bar['EMA8']),
    '2mFL':                n(bar['2mFL']),
    '2mNL':                n(bar['2mNL']),
    '30mFL':               n(bar['30mFL']),
    '30mNL':               n(bar['30mNL']),
    '30mEMA8':             n(bar['30mEMA8']),
    '30m CentreLine':      n(bar['30m CentreLine']),
    '30sFL':               n(bar['30sFL']),
    '30sNL':               n(bar['30sNL']),
    '2kWCL':               n(bar['2kWCL']),
    VWAP:                  n(bar['VWAP']),
    TB1:                   n(bar['TB1']),
    BB1:                   n(bar['BB1']),
    TB2:                   n(bar['TB2']),
    BB2:                   n(bar['BB2']),
    TB3:                   n(bar['TB3']),
    BB3:                   n(bar['BB3']),
    DWbid:                 n(bar['DWbid']),
    DWask:                 n(bar['DWask']),
    '2000Vol Wave Range':  n(bar['2000Vol Wave Range']),
    '2m WaveRange':        n(bar['2m WaveRange']),
    '2kEMA8 vs 2kWCL':     n(bar['2kEMA8 vs 2kWCL']),
    '2kEMA8 vs 2mWCL':     n(bar['2kEMA8 vs 2mWCL']),
    '2kWCL vs 2mWCL':      n(bar['2kWCL vs 2mWCL']),
    '2kWave':              wave('2kWave'),
    '30mWave':             optWave('30mWave'),
    '2mWave':              optWave('2mWave'),
    '30sWave':             optWave('30sWave'),
    'RawASK-BID':          n(bar['RawASK-BID']),
    RawAsk:                n(bar['RawAsk']),
    RawBid:                n(bar['RawBid']),
    'Net DWSkew':          n(bar['Net DWSkew']),
    'BID%':                n(bar['BID%']),
    'ASK%':                n(bar['ASK%']),
    'Delta%':              n(bar['Delta%']),
    E8_2kCL:               n(bar['E8_2kCL']),
    E8_2mCL:               n(bar['E8_2mCL']),
    '2mCL':                n(bar['2mCL']),
    BullishDSS:            n(bar['BullishDSS']),
    BearishDSS:            n(bar['BearishDSS']),
    wBID:                  n(bar['wBID']),
    wASK:                  n(bar['wASK']),
    vwap_TB1:              n(bar['vwap_TB1']),
    BarRange:              n(bar['BarRange']),
    ATR:                   n(bar['ATR']),
    IBHigh:                n(bar['IBHigh']),
    IBLow:                 n(bar['IBLow']),
    // ── EdgeBase fields ───────────────────────────────────────────────────────
    Daily_POC:  n(bar['Daily_POC']),
    Daily_VAH:  n(bar['Daily_VAH']),
    Daily_VAL:  n(bar['Daily_VAL']),
    poc30m:     n(bar['poc30m']),
    vah30m:     n(bar['vah30m']),
    val30m:     n(bar['val30m']),
    LH_Hi:      n(bar['LH_Hi']),
    LH_Lo:      n(bar['LH_Lo']),
    CVDOpen:    n(bar['CVDOpen']),
    CVDHigh:    n(bar['CVDHigh']),
    CVDLow:     n(bar['CVDLow']),
    CVDClose:   n(bar['CVDClose']),
    Delta:      n(bar['Delta']) || n(bar['Ask Volume']) - n(bar['Bid Volume']),
  }
}

// ─── Sequential: ATR + BarRange across sorted bars ────────────────────────────
const ATR_PERIOD = 14

function computeSequentialMetrics(bars: RawRow[]): void {
  let prevClose = 0
  let prevATR   = 0

  for (let i = 0; i < bars.length; i++) {
    const bar  = bars[i]
    const high = n(bar['High'])
    const low  = n(bar['Low'])
    const close = n(bar['Last'])

    bar['BarRange'] = parseFloat((high - low).toFixed(4))

    const tr = i === 0 || prevClose === 0
      ? high - low
      : Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))

    if (i === 0) {
      prevATR = tr
    } else if (i < ATR_PERIOD) {
      // SMA warmup
      prevATR = ((prevATR * i) + tr) / (i + 1)
    } else {
      // Wilder smoothing
      prevATR = (prevATR * (ATR_PERIOD - 1) + tr) / ATR_PERIOD
    }

    bar['ATR'] = parseFloat(prevATR.toFixed(4))
    prevClose  = close
  }
}

// ─── Per-day: Initial Balance (09:30 – 10:30) ─────────────────────────────────
function computeInitialBalance(bars: RawRow[]): void {
  const byDate = new Map<string, RawRow[]>()
  for (const bar of bars) {
    const key = String(bar['Date']).slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(bar)
  }

  for (const dayBars of byDate.values()) {
    const ibBars = dayBars.filter(b => {
      const t = String(b['Time'])
      return t >= '09:30:00' && t <= '10:30:00'
    })

    const ibHigh = ibBars.length ? Math.max(...ibBars.map(b => n(b['High']))) : 0
    const ibLow  = ibBars.length ? Math.min(...ibBars.map(b => n(b['Low'])))  : 0

    for (const bar of dayBars) {
      bar['IBHigh'] = parseFloat(ibHigh.toFixed(4))
      bar['IBLow']  = parseFloat(ibLow.toFixed(4))
    }
  }
}

// ─── Date range helpers ───────────────────────────────────────────────────────
function fmtDateRange(dates: string[]): string {
  if (!dates.length) return 'no dates found'
  const sorted = [...dates].sort()
  const fmt = (d: string) => {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return sorted[0] === sorted[sorted.length - 1]
    ? fmt(sorted[0])
    : `${fmt(sorted[0])} → ${fmt(sorted[sorted.length - 1])}`
}

// ─── Main export ──────────────────────────────────────────────────────────────
export interface NormalizeResult {
  trades: Trade[]
  warnings: string[]
}

export function normalizeFromRaw(
  marketBuffer: ArrayBuffer,
  tradeBuffer: ArrayBuffer,
): NormalizeResult {
  // 1. Parse and compute market bars
  const rawBars = parseTxt(marketBuffer)
  if (!rawBars.length) throw new Error(
    'Market data file is empty or could not be parsed.\n' +
    'Expected a Sierra Chart bar export (wme_fasterV2.txt or EdgeBase_1m.txt / EdgeBase_10seconds.txt).'
  )

  // Validate required market columns.
  // After SC_RENAME, both wme_fasterV2 and EdgeBase files share the same canonical names.
  const requiredMarket = ['Date', 'Time', 'Bid Volume', 'Ask Volume']
  const missingMarket  = requiredMarket.filter(c => !(c in rawBars[0]))
  if (missingMarket.length) throw new Error(
    `Market data file is missing required columns: ${missingMarket.join(', ')}.\n` +
    `Expected a Sierra Chart bar export (wme_fasterV2.txt or EdgeBase_1m.txt / EdgeBase_10seconds.txt).`
  )
  // Warn (not error) if wave data is absent — file may still be usable for basic analytics
  const hasWaveData = ('EMA8' in rawBars[0]) || ('2kFL' in rawBars[0])
  if (!hasWaveData) console.warn('[normalizer] No wave channel data found — wave stats will be empty.')

  const bars = rawBars.map(computeDerived)

  // Sequential metrics (ATR needs ordered bars) and per-day IB
  computeSequentialMetrics(bars)
  computeInitialBalance(bars)

  // 2. Index bars by date and collect the market date range
  const barsByDate  = new Map<string, RawRow[]>()
  const marketDates = new Set<string>()
  for (const bar of bars) {
    const key = String(bar['Date']).trim().slice(0, 10)
    if (!key) continue
    marketDates.add(key)
    if (!barsByDate.has(key)) barsByDate.set(key, [])
    barsByDate.get(key)!.push(bar)
  }

  // 3. Parse trades
  const rawTrades = parseTrades(tradeBuffer)
  if (!rawTrades.length) throw new Error(
    'Trade activity file (TradeActivity.xlsx) is empty or could not be parsed.'
  )

  const dtCol = findDateTimeCol(rawTrades[0])
  if (!dtCol) throw new Error(
    `Could not find an Entry DateTime column in TradeActivity.\n` +
    `Columns found: ${Object.keys(rawTrades[0]).join(', ')}\n` +
    `Expected one of: Entry DateTime, EntryDateTime, Entry Date Time.`
  )

  // Collect trade date range
  const tradeDates = new Set<string>()
  for (const t of rawTrades) {
    const dt = formatDt(t[dtCol])
    if (dt) tradeDates.add(dt.slice(0, 10))
  }

  // Helper: subtract one calendar day
  function prevCalDate(d: string): string {
    const dt = new Date(d); dt.setDate(dt.getDate() - 1)
    return dt.toISOString().slice(0, 10)
  }

  // 4. Check date overlap — extend market dates by +1 day to handle evening session
  // trades (Sierra Chart logs e.g. a 20:08 trade on May 20 under May 21).
  const marketDatesExtended = new Set([...marketDates])
  for (const d of marketDates) {
    const next = new Date(d); next.setDate(next.getDate() + 1)
    marketDatesExtended.add(next.toISOString().slice(0, 10))
  }
  const overlapping = [...tradeDates].filter(d => marketDatesExtended.has(d))
  if (!overlapping.length) throw new Error(
    `Date mismatch — the two files cover different date ranges and share no trading days.\n\n` +
    `Market data:    ${fmtDateRange([...marketDates])}\n` +
    `Trade activity: ${fmtDateRange([...tradeDates])}\n\n` +
    `Make sure both files cover the same period. If you ran a Sierra Chart replay with older dates, ` +
    `reload wme_fasterV2.txt with live/current data before importing.`
  )

  // 5. Join each trade to its closest bar on the same date.
  // Fallback: if no bars on the trade date (evening session trade logged under next
  // calendar day by Sierra Chart), try the previous calendar date's bars.
  const result:   Trade[]  = []
  const warnings: string[] = []
  let   skipped            = 0

  rawTrades
    .filter(t => t[dtCol] != null)
    .forEach((t, i) => {
      const entryDt = formatDt(t[dtCol])
      if (!entryDt) return

      const dateKey = entryDt.slice(0, 10)
      const dayBars = barsByDate.get(dateKey) ?? barsByDate.get(prevCalDate(dateKey))
      if (!dayBars?.length) { skipped++; return }

      // Find bar closest in time to entry
      const entrySecs = dtToSeconds(entryDt)
      let closestBar  = dayBars[0]
      let minDiff     = Infinity
      for (const bar of dayBars) {
        const diff = Math.abs(timeStrToSeconds(String(bar['Time'])) - entrySecs)
        if (diff < minDiff) { minDiff = diff; closestBar = bar }
      }

      const entryPrice = Number(t['Entry Price'] ?? 0)
      const bands      = entryVsBands(entryPrice, closestBar)
      const note       = String(t['Note'] ?? '')

      const exitDt   = formatDt(t['Exit DateTime'])
      const entryMs  = new Date(entryDt).getTime()
      const exitMs   = exitDt ? new Date(exitDt).getTime() : 0
      const duration = entryMs > 0 && exitMs > entryMs
        ? (exitMs - entryMs) / (1000 * 86400)   // fractional days, always accurate
        : parseDuration(t['Duration'])            // fallback if datetimes unavailable

      result.push({
        id:                           String(i),
        Symbol:                       String(t['Symbol'] ?? 'MNQ'),
        Note:                         note,
        Setup:                        note.split(',')[0].trim(),
        'Trade Type':                 String(t['Trade Type'] ?? 'Long') as 'Long' | 'Short',
        'Entry DateTime':             entryDt,
        'Exit DateTime':              exitDt,
        Duration:                     duration,
        'Entry Price':                entryPrice,
        'Exit Price':                 Number(t['Exit Price']                    ?? 0),
        'Low Price While Open':       Number(t['Low Price While Open']          ?? 0),
        'High Price While Open':      Number(t['High Price While Open']         ?? 0),
        'Trade Quantity':             Number(t['Trade Quantity']                ?? 1),
        'Profit/Loss (C)':            Number(t['Profit/Loss (C)']              ?? 0),
        'Net PnL':                    Number(t['Net PnL']                      ?? 0),
        'Max Open Profit (C)':        Number(t['Max Open Profit (C)']          ?? 0),
        'Max Open Loss (C)':          Number(t['Max Open Loss (C)']            ?? 0),
        'Commission (C)':             Number(t['Commission (C)']               ?? 0),
        'Cumulative Profit/Loss (C)': Number(t['Cumulative Profit/Loss (C)']   ?? 0),
        Account:                      String(t['Account']                      ?? ''),
        'Entry >VWAP':                bands['Entry >VWAP'],
        'Entry >TB1':                 bands['Entry >TB1'],
        'Entry >TB2':                 bands['Entry >TB2'],
        'Entry >TB3':                 bands['Entry >TB3'],
        'Entry <BB1':                 bands['Entry <BB1'],
        'Entry <BB2':                 bands['Entry <BB2'],
        'Entry <BB3':                 bands['Entry <BB3'],
        market:                       toMarketBar(closestBar),
      })
    })

  if (!result.length) throw new Error(
    `No trades could be matched to market data.\n` +
    `Trades attempted: ${rawTrades.length} · Market dates available: ${marketDates.size}\n\n` +
    `Market data:    ${fmtDateRange([...marketDates])}\n` +
    `Trade activity: ${fmtDateRange([...tradeDates])}`
  )

  if (skipped > 0) {
    const pct = ((skipped / rawTrades.length) * 100).toFixed(0)
    warnings.push(
      `${skipped} of ${rawTrades.length} trades (${pct}%) had no matching market data bar and were skipped. ` +
      `This usually means those trade dates are not covered by the current wme_fasterV2.txt file.`
    )
  }

  return { trades: result, warnings }
}
