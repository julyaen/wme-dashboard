import * as XLSX from 'xlsx'
import type {
  Trade, MarketBar, DashboardStats, DailyStats,
  SetupStats, WaveStats, BucketStats
} from '@/types'

// ─── Parse uploaded XLSX ───────────────────────────────────────────────────────
export function parseXLSX(buffer: ArrayBuffer): Trade[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[]

  // Strip leading/trailing spaces from all column names
  const raw = rawRows.map(r => {
    const cleaned: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r)) {
      cleaned[k.trim()] = v
    }
    return cleaned
  })

  return raw
    .filter(r => r['Entry DateTime'] != null)
    .map((r, i) => {
      const market = extractMarket(r)
      const note = String(r['Note'] ?? '')
      return {
        id: String(i),
        Symbol: String(r['Symbol'] ?? 'MNQ'),
        Note: note,
        Setup: note.split(',')[0].trim(),
        'Trade Type': String(r['Trade Type'] ?? 'Long') as 'Long' | 'Short',
        'Entry DateTime': formatDt(r['Entry DateTime']),
        'Exit DateTime': formatDt(r['Exit DateTime']),
        Duration: Number(r['Duration'] ?? 0),
        'Entry Price': Number(r['Entry Price'] ?? 0),
        'Exit Price': Number(r['Exit Price'] ?? 0),
        'Low Price While Open': Number(r['Low Price While Open'] ?? 0),
        'High Price While Open': Number(r['High Price While Open'] ?? 0),
        'Trade Quantity': Number(r['Trade Quantity'] ?? 1),
        'Profit/Loss (C)': Number(r['Profit/Loss (C)'] ?? 0),
        'Net PnL': Number(r['Net PnL'] ?? 0),
        'Max Open Profit (C)': Number(r['Max Open Profit (C)'] ?? 0),
        'Max Open Loss (C)': Number(r['Max Open Loss (C)'] ?? 0),
        'Commission (C)': Number(r['Commission (C)'] ?? 0),
        'Cumulative Profit/Loss (C)': Number(r['Cumulative Profit/Loss (C)'] ?? 0),
        Account: String(r['Account'] ?? ''),
        'Entry >VWAP': String(r['Entry >VWAP'] ?? ''),
        'Entry >TB1': String(r['Entry >TB1'] ?? ''),
        'Entry >TB2': String(r['Entry >TB2'] ?? ''),
        'Entry >TB3': String(r['Entry >TB3'] ?? ''),
        'Entry <BB1': String(r['Entry <BB1'] ?? ''),
        'Entry <BB2': String(r['Entry <BB2'] ?? ''),
        'Entry <BB3': String(r['Entry <BB3'] ?? ''),
        market,
      } satisfies Trade
    })
}

function formatDt(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

// Handles both "HH:MM:SS.ffffff" strings and fractional-day numbers (Sierra Chart formats)
function parseTime(val: unknown): string {
  if (!val && val !== 0) return ''
  // Fractional day (e.g. 0.3965625 = 09:31:03)
  if (typeof val === 'number') {
    const totalSec = Math.round(val * 86400)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }
  // String — strip leading space, drop microseconds
  return String(val).trim().split('.')[0]
}

function extractMarket(r: Record<string, unknown>): MarketBar {
  const n = (k: string) => Number(r[k] ?? 0)
  const s = (k: string) => String(r[k] ?? '')
  const wave = (k: string): 'Green' | 'Red' => {
    const v = s(k).trim()
    return v === 'Green' ? 'Green' : 'Red'
  }
  return {
    Date: formatDt(r['Date']),
    Time: parseTime(r['Time']),
    'Time Bucket': s('Time Bucket'),
    Open: n('Open'), High: n('High'), Low: n('Low'), Last: n('Last'),
    Volume: n('Volume'),
    'Bid Volume': n('Bid Volume'),
    'Ask Volume': n('Ask Volume'),
    'ASK>1050': n('ASK>1050'),
    'BID<950': n('BID<950'),
    'BID>1050': n('BID>1050'),
    'ASK<950': n('ASK<950'),
    '2kFL': n('2kFL'), '2kNL': n('2kNL'), EMA8: n('EMA8'),
    '2mFL': n('2mFL'), '2mNL': n('2mNL'),
    '30mFL': n('30mFL'), '30mNL': n('30mNL'), '30mEMA8': n('30mEMA8'),
    '30m CentreLine': n('30m CentreLine'),
    '30sFL': n('30sFL'), '30sNL': n('30sNL'),
    '2kWCL': n('2kWCL'),
    VWAP: n('VWAP'), TB1: n('TB1'), BB1: n('BB1'),
    TB2: n('TB2'), BB2: n('BB2'), TB3: n('TB3'), BB3: n('BB3'),
    DWbid: n('DWbid'), DWask: n('DWask'),
    '2000Vol Wave Range': n('2000Vol Wave Range'),
    '2m WaveRange': n('2m WaveRange'),
    '2kEMA8 vs 2kWCL': n('2kEMA8 vs 2kWCL'),
    '2kEMA8 vs 2mWCL': n('2kEMA8 vs 2mWCL'),
    '2kWCL vs 2mWCL': n('2kWCL vs 2mWCL'),
    '2kWave': wave('2kWave'),
    '30mWave': wave('30mWave'),
    '2mWave': wave('2mWave'),
    '30sWave': wave('30sWave'),
    'RawASK-BID': n('RawASK-BID'),
    RawAsk: n('RawAsk'), RawBid: n('RawBid'),
    'Net DWSkew': n('Net DWSkew'),
    'BID%': n('BID%'), 'ASK%': n('ASK%'), 'Delta%': n('Delta%'),
    E8_2kCL: n('E8_2kCL'), E8_2mCL: n('E8_2mCL'),
    '2mCL': n('2mCL'),
    BullishDSS: n('BullishDSS'), BearishDSS: n('BearishDSS'),
    wBID: n('wBID'), wASK: n('wASK'),
    vwap_TB1: n('vwap_TB1'),
    BarRange: n('BarRange') || (n('High') - n('Low')),
    ATR:      n('ATR'),
    IBHigh:   n('IBHigh'),
    IBLow:    n('IBLow'),
    // EdgeBase fields — not present in normalized XLSX, default to 0
    Daily_POC: n('Daily_POC'), Daily_VAH: n('Daily_VAH'), Daily_VAL: n('Daily_VAL'),
    poc30m: n('poc30m'), vah30m: n('vah30m'), val30m: n('val30m'),
    LH_Hi: n('LH_Hi'), LH_Lo: n('LH_Lo'),
    CVDOpen: n('CVDOpen'), CVDHigh: n('CVDHigh'), CVDLow: n('CVDLow'), CVDClose: n('CVDClose'),
    Delta: n('Delta'),
  }
}

// ─── Analytics engine ──────────────────────────────────────────────────────────
export function computeStats(trades: Trade[]): DashboardStats {
  const winners = trades.filter(t => t['Net PnL'] > 0)
  const losers  = trades.filter(t => t['Net PnL'] < 0)

  const netPnL  = sum(trades.map(t => t['Net PnL']))
  const avgWin  = winners.length ? sum(winners.map(t => t['Net PnL'])) / winners.length : 0
  const avgLoss = losers.length  ? Math.abs(sum(losers.map(t => t['Net PnL'])) / losers.length) : 0
  const pf      = (avgLoss > 0 && losers.length > 0)
    ? (avgWin * winners.length) / (avgLoss * losers.length) : 0
  const wr      = trades.length ? winners.length / trades.length : 0
  const exp     = wr * avgWin - (1 - wr) * avgLoss

  // Equity curve
  let cum = 0
  const equityCurve = trades.map((t, i) => {
    cum += t['Net PnL']
    return { trade: i + 1, cumPnL: parseFloat(cum.toFixed(2)) }
  })

  // Daily PnL
  const byDay = groupBy(trades, t => t['Entry DateTime'].slice(0, 10))
  const dailyPnL: DailyStats[] = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ts]) => {
      const w = ts.filter(t => t['Net PnL'] > 0).length
      return {
        date,
        trades: ts.length,
        wins: w,
        losses: ts.length - w,
        netPnL: parseFloat(sum(ts.map(t => t['Net PnL'])).toFixed(2)),
        winRate: ts.length ? parseFloat((w / ts.length * 100).toFixed(1)) : 0,
      }
    })

  const bestDay  = [...dailyPnL].sort((a, b) => b.netPnL - a.netPnL)[0]
  const worstDay = [...dailyPnL].sort((a, b) => a.netPnL - b.netPnL)[0]

  // Setup stats
  const bySetup = groupBy(trades, t => t.Setup)
  const setupStats: SetupStats[] = Object.entries(bySetup).map(([name, ts]) => {
    const w = ts.filter(t => t['Net PnL'] > 0).length
    return {
      name,
      trades: ts.length,
      wins: w,
      losses: ts.length - w,
      netPnL: parseFloat(sum(ts.map(t => t['Net PnL'])).toFixed(2)),
      avgPnL: parseFloat((sum(ts.map(t => t['Net PnL'])) / ts.length).toFixed(2)),
      avgMFE: parseFloat((sum(ts.map(t => t['Max Open Profit (C)'])) / ts.length).toFixed(2)),
      avgMAE: parseFloat((sum(ts.map(t => t['Max Open Loss (C)'])) / ts.length).toFixed(2)),
      winRate: parseFloat((w / ts.length * 100).toFixed(1)),
    }
  }).sort((a, b) => b.netPnL - a.netPnL)

  // Wave stats
  const waveStats: WaveStats[] = []
  for (const wave of ['2kWave', '2mWave', '30mWave', '30sWave'] as const) {
    for (const state of ['Green', 'Red'] as const) {
      const ts = trades.filter(t => t.market[wave] === state)
      const w = ts.filter(t => t['Net PnL'] > 0).length
      waveStats.push({
        wave,
        state,
        trades: ts.length,
        wins: w,
        netPnL: parseFloat(sum(ts.map(t => t['Net PnL'])).toFixed(2)),
        winRate: ts.length ? parseFloat((w / ts.length * 100).toFixed(1)) : 0,
      })
    }
  }

  // Time buckets
  const byBucket = groupBy(trades, t => t.market['Time Bucket'])
  const timeBuckets: BucketStats[] = Object.entries(byBucket)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, ts]) => {
      const w = ts.filter(t => t['Net PnL'] > 0).length
      const net = sum(ts.map(t => t['Net PnL']))
      return {
        bucket,
        trades: ts.length,
        wins: w,
        netPnL: parseFloat(net.toFixed(2)),
        avgPnL: parseFloat((net / ts.length).toFixed(2)),
        winRate: parseFloat((w / ts.length * 100).toFixed(1)),
      }
    })

  // E8_2kCL buckets
  const e8kDefs = [
    { bucket: '<-20',   test: (v: number) => v < -20 },
    { bucket: '-20:-10',test: (v: number) => v >= -20 && v < -10 },
    { bucket: '-10:-5', test: (v: number) => v >= -10 && v < -5 },
    { bucket: '-5:0',   test: (v: number) => v >= -5  && v < 0 },
    { bucket: '0:5',    test: (v: number) => v >= 0   && v < 5 },
    { bucket: '5:10',   test: (v: number) => v >= 5   && v < 10 },
    { bucket: '10:20',  test: (v: number) => v >= 10  && v < 20 },
    { bucket: '>20',    test: (v: number) => v >= 20 },
  ]
  const e8kBuckets = e8kDefs.map(({ bucket, test }) => {
    const ts = trades.filter(t => test(t.market.E8_2kCL))
    const w = ts.filter(t => t['Net PnL'] > 0).length
    const net = sum(ts.map(t => t['Net PnL']))
    return { bucket, trades: ts.length, wins: w, netPnL: parseFloat(net.toFixed(2)), avgPnL: ts.length ? parseFloat((net/ts.length).toFixed(2)) : 0, winRate: ts.length ? parseFloat((w/ts.length*100).toFixed(1)) : 0 }
  })

  // E8_2mCL buckets
  const e8mDefs = [
    { bucket: '<-40',  test: (v: number) => v < -40 },
    { bucket: '-40:-20',test:(v: number) => v >= -40 && v < -20 },
    { bucket: '-20:0', test: (v: number) => v >= -20 && v < 0 },
    { bucket: '0:20',  test: (v: number) => v >= 0   && v < 20 },
    { bucket: '20:40', test: (v: number) => v >= 20  && v < 40 },
    { bucket: '40:60', test: (v: number) => v >= 40  && v < 60 },
    { bucket: '>60',   test: (v: number) => v >= 60 },
  ]
  const e8mBuckets = e8mDefs.map(({ bucket, test }) => {
    const ts = trades.filter(t => test(t.market.E8_2mCL))
    const w = ts.filter(t => t['Net PnL'] > 0).length
    const net = sum(ts.map(t => t['Net PnL']))
    return { bucket, trades: ts.length, wins: w, netPnL: parseFloat(net.toFixed(2)), avgPnL: ts.length ? parseFloat((net/ts.length).toFixed(2)) : 0, winRate: ts.length ? parseFloat((w/ts.length*100).toFixed(1)) : 0 }
  })

  // Delta% buckets
  const deltaDefs = [
    { bucket: '<-30%',   test: (v: number) => v < -0.30 },
    { bucket: '-30:-10%',test: (v: number) => v >= -0.30 && v < -0.10 },
    { bucket: '-10:0%',  test: (v: number) => v >= -0.10 && v < 0 },
    { bucket: '0:10%',   test: (v: number) => v >= 0     && v < 0.10 },
    { bucket: '10:30%',  test: (v: number) => v >= 0.10  && v < 0.30 },
    { bucket: '>30%',    test: (v: number) => v >= 0.30 },
  ]
  const deltaBuckets = deltaDefs.map(({ bucket, test }) => {
    const ts = trades.filter(t => test(t.market['Delta%']))
    const w = ts.filter(t => t['Net PnL'] > 0).length
    const net = sum(ts.map(t => t['Net PnL']))
    return { bucket, trades: ts.length, wins: w, netPnL: parseFloat(net.toFixed(2)), avgPnL: ts.length ? parseFloat((net/ts.length).toFixed(2)) : 0, winRate: ts.length ? parseFloat((w/ts.length*100).toFixed(1)) : 0 }
  })

  // ── Weekly PnL ────────────────────────────────────────────────────────────
  function getWeek(iso: string): string {
    const d = new Date(iso)
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const wk = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${String(wk).padStart(2,'0')}`
  }
  const byWeek = groupBy(trades, t => getWeek(t['Entry DateTime']))
  const weeklyPnL = Object.entries(byWeek)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([week, ts]) => {
      const w = ts.filter(t => t['Net PnL'] > 0).length
      const net = parseFloat(sum(ts.map(t => t['Net PnL'])).toFixed(2))
      return { week, netPnL: net, trades: ts.length, wins: w, winRate: parseFloat((w/ts.length*100).toFixed(1)) }
    })

  // ── Monthly PnL ───────────────────────────────────────────────────────────
  const byMonth = groupBy(trades, t => t['Entry DateTime'].slice(0,7))
  const monthlyPnL = Object.entries(byMonth)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([month, ts]) => {
      const w = ts.filter(t => t['Net PnL'] > 0).length
      const net = parseFloat(sum(ts.map(t => t['Net PnL'])).toFixed(2))
      return { month, netPnL: net, trades: ts.length, wins: w, winRate: parseFloat((w/ts.length*100).toFixed(1)) }
    })

  // ── Longest streaks ────────────────────────────────────────────────────────
  let longestWinStreak = 0, longestLossStreak = 0
  let curWin = 0, curLoss = 0
  for (const t of trades) {
    if (t['Net PnL'] > 0) { curWin++; curLoss = 0; longestWinStreak = Math.max(longestWinStreak, curWin) }
    else if (t['Net PnL'] < 0) { curLoss++; curWin = 0; longestLossStreak = Math.max(longestLossStreak, curLoss) }
    else { curWin = 0; curLoss = 0 }
  }

  // ── Best / worst setup (min 2 trades, ranked by netPnL then winRate) ───────
  const eligibleSetups = setupStats.filter(s => s.trades >= 2)
  const bestSetup  = eligibleSetups.length ? [...eligibleSetups].sort((a,b) => b.netPnL - a.netPnL || b.winRate - a.winRate)[0] : null
  const worstSetup = eligibleSetups.length ? [...eligibleSetups].sort((a,b) => a.netPnL - b.netPnL || a.winRate - b.winRate)[0] : null

  // ── Long vs Short ─────────────────────────────────────────────────────────
  const longs  = trades.filter(t => t['Trade Type'] === 'Long')
  const shorts = trades.filter(t => t['Trade Type'] === 'Short')
  const longWins  = longs.filter(t => t['Net PnL'] > 0).length
  const shortWins = shorts.filter(t => t['Net PnL'] > 0).length
  const longStats  = { trades: longs.length,  wins: longWins,  netPnL: parseFloat(sum(longs.map(t=>t['Net PnL'])).toFixed(2)),  winRate: longs.length  ? parseFloat((longWins/longs.length*100).toFixed(1))   : 0 }
  const shortStats = { trades: shorts.length, wins: shortWins, netPnL: parseFloat(sum(shorts.map(t=>t['Net PnL'])).toFixed(2)), winRate: shorts.length ? parseFloat((shortWins/shorts.length*100).toFixed(1)) : 0 }

  // ── Calendar data (keyed by YYYY-MM-DD) ──────────────────────────────────
  const calendarData: Record<string, { netPnL: number; trades: number; wins: number }> = {}
  for (const t of trades) {
    const day = t['Entry DateTime'].slice(0, 10)
    if (!calendarData[day]) calendarData[day] = { netPnL: 0, trades: 0, wins: 0 }
    calendarData[day].netPnL   = parseFloat((calendarData[day].netPnL + t['Net PnL']).toFixed(2))
    calendarData[day].trades  += 1
    calendarData[day].wins    += t['Net PnL'] > 0 ? 1 : 0
  }

  // ── Drawdown curve ─────────────────────────────────────────────────────────
  let cumPnL = 0, runningMax = 0
  const drawdownCurve = trades.map((t, i) => {
    cumPnL     += t['Net PnL']
    runningMax  = Math.max(runningMax, cumPnL)
    return {
      trade: i + 1,
      cumPnL:     parseFloat(cumPnL.toFixed(2)),
      drawdown:   parseFloat((cumPnL - runningMax).toFixed(2)),
      runningMax: parseFloat(runningMax.toFixed(2)),
    }
  })
  const maxDrawdown = parseFloat(Math.min(...drawdownCurve.map(d => d.drawdown)).toFixed(2))
  const maxRunup    = parseFloat(Math.max(...drawdownCurve.map(d => d.cumPnL)).toFixed(2))

  // ── Rolling expectancy (20-trade window) ──────────────────────────────────
  const WINDOW = 20
  const rollingExpectancy = trades.map((_, i) => {
    if (i < WINDOW - 1) return { trade: i + 1, value: null }
    const slice = trades.slice(i - WINDOW + 1, i + 1)
    const val = parseFloat((sum(slice.map(t => t['Net PnL'])) / WINDOW).toFixed(2))
    return { trade: i + 1, value: val }
  })

  // ── Weekday stats ─────────────────────────────────────────────────────────
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday']
  const byDay2 = groupBy(trades, t => {
    const d = new Date(t['Entry DateTime'])
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]
  })
  const weekdayStats = DAYS.map(day => {
    const ts = byDay2[day] ?? []
    const w  = ts.filter(t => t['Net PnL'] > 0).length
    return {
      day,
      trades:  ts.length,
      wins:    w,
      netPnL:  parseFloat(sum(ts.map(t => t['Net PnL'])).toFixed(2)),
      winRate: ts.length ? parseFloat((w / ts.length * 100).toFixed(1)) : 0,
    }
  })

  // ── Risk metrics ──────────────────────────────────────────────────────────
  const dailyReturns = dailyPnL.map(d => d.netPnL)
  const nDays = dailyReturns.length
  const avgDailyReturn = nDays > 0 ? sum(dailyReturns) / nDays : 0

  const stdDevDaily = nDays > 1
    ? parseFloat(Math.sqrt(
        dailyReturns.reduce((acc, r) => acc + Math.pow(r - avgDailyReturn, 2), 0) / (nDays - 1)
      ).toFixed(2))
    : 0

  // Downside deviation: sqrt(mean of min(r, 0)^2) across all trading days
  const downsideDev = nDays > 0
    ? Math.sqrt(dailyReturns.reduce((acc, r) => acc + Math.pow(Math.min(r, 0), 2), 0) / nDays)
    : 0

  const sharpe   = stdDevDaily > 0
    ? parseFloat(((avgDailyReturn / stdDevDaily) * Math.sqrt(252)).toFixed(2))
    : 0
  const sortino  = downsideDev > 0
    ? parseFloat(((avgDailyReturn / downsideDev) * Math.sqrt(252)).toFixed(2))
    : 0

  // Calmar = annualised net PnL / |max drawdown|
  const annualisedReturn = nDays > 0 ? netPnL * (252 / nDays) : 0
  const calmar = maxDrawdown < 0
    ? parseFloat((annualisedReturn / Math.abs(maxDrawdown)).toFixed(2))
    : 0

  // Recovery factor = net PnL / |max drawdown|
  const recoveryFactor = maxDrawdown < 0
    ? parseFloat((netPnL / Math.abs(maxDrawdown)).toFixed(2))
    : 0

  // MFE capture = avg(net PnL / MFE) for trades where MFE > 0
  const tradesWithMFE = trades.filter(t => t['Max Open Profit (C)'] > 0)
  const avgMFECapture = tradesWithMFE.length > 0
    ? parseFloat(
        (tradesWithMFE.reduce((acc, t) => acc + t['Net PnL'] / t['Max Open Profit (C)'], 0)
          / tradesWithMFE.length * 100).toFixed(1)
      )
    : 0

  // ── Session stats (AM = before 12:00, PM = 12:00+) ────────────────────────
  const amTrades = trades.filter(t => new Date(t['Entry DateTime']).getHours() < 12)
  const pmTrades = trades.filter(t => new Date(t['Entry DateTime']).getHours() >= 12)

  function mkSession(label: string, ts: typeof trades) {
    const w   = ts.filter(t => t['Net PnL'] > 0).length
    const net = parseFloat(sum(ts.map(t => t['Net PnL'])).toFixed(2))
    return {
      session: label,
      trades:  ts.length,
      wins:    w,
      netPnL:  net,
      winRate: ts.length ? parseFloat((w / ts.length * 100).toFixed(1)) : 0,
      avgPnL:  ts.length ? parseFloat((net / ts.length).toFixed(2)) : 0,
    }
  }

  const sessionStats = [mkSession('AM', amTrades), mkSession('PM', pmTrades)]

  return {
    totalTrades: trades.length,
    winners: winners.length,
    losers: losers.length,
    netPnL: parseFloat(netPnL.toFixed(2)),
    winRate: parseFloat((wr * 100).toFixed(1)),
    avgWinner: parseFloat(avgWin.toFixed(2)),
    avgLoser: parseFloat(avgLoss.toFixed(2)),
    profitFactor: parseFloat(pf.toFixed(2)),
    expectancy: parseFloat(exp.toFixed(2)),
    totalCommission: parseFloat(sum(trades.map(t => t['Commission (C)'])).toFixed(2)),
    bestDay,
    worstDay,
    equityCurve,
    dailyPnL,
    setupStats,
    waveStats,
    timeBuckets,
    e8kBuckets,
    e8mBuckets,
    deltaBuckets,
    weeklyPnL,
    monthlyPnL,
    longestWinStreak,
    longestLossStreak,
    bestSetup,
    worstSetup,
    longStats,
    shortStats,
    calendarData,
    drawdownCurve,
    maxDrawdown,
    maxRunup,
    rollingExpectancy,
    weekdayStats,
    sharpe,
    sortino,
    calmar,
    recoveryFactor,
    avgDailyReturn: parseFloat(avgDailyReturn.toFixed(2)),
    stdDevDaily,
    avgMFECapture,
    sessionStats,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce((acc, t) => {
    const k = key(t)
    ;(acc[k] = acc[k] ?? []).push(t)
    return acc
  }, {} as Record<string, T[]>)
}

export function fmtDuration(val: number): string {
  // Handles both fractional days (Sierra Chart) and raw seconds
  const totalSec = val < 1 ? Math.round(val * 86400) : Math.round(val)
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function fmtDt(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const mo = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${day} ${h}:${min}`
}

export function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function clx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ─── Compute actual data ranges for filter sliders ────────────────────────────
import type { FilterRanges } from '@/types/filters'

export function computeRanges(trades: Trade[]): FilterRanges {
  if (!trades.length) return {
    deltaMin: -1,    deltaMax: 1,
    e8kMin: -200,    e8kMax: 200,
    e8mMin: -200,    e8mMax: 200,
    bullMin: 0,      bullMax: 100,
    bearMin: 0,      bearMax: 100,
    rawMin: -800,    rawMax: 800,
    dwImbalanceMin: -1, dwImbalanceMax: 1,
    wcl2k2mMin: -200, wcl2k2mMax: 200,
  }

  const deltas   = trades.map(t => t.market['Delta%'])
  const e8ks     = trades.map(t => t.market.E8_2kCL)
  const e8ms     = trades.map(t => t.market.E8_2mCL)
  const bulls    = trades.map(t => t.market.BullishDSS)
  const bears    = trades.map(t => t.market.BearishDSS)
  const raws     = trades.map(t => t.market['RawASK-BID'])
  const dwImbalances = trades.map(t => t.market.DWask - t.market.DWbid)
  const wcl2k2ms = trades.map(t => t.market['2kWCL vs 2mWCL'])

  const flr = (arr: number[]) => Math.floor(Math.min(...arr))
  const cel = (arr: number[]) => Math.ceil(Math.max(...arr))

  return {
    deltaMin:    Math.max(-1,  flr(deltas)),
    deltaMax:    Math.min(1,   cel(deltas)),
    e8kMin:      flr(e8ks)   - 5,
    e8kMax:      cel(e8ks)   + 5,
    e8mMin:      flr(e8ms)   - 5,
    e8mMax:      cel(e8ms)   + 5,
    bullMin:     Math.max(0,   flr(bulls)),
    bullMax:     Math.min(100, cel(bulls)),
    bearMin:     Math.max(0,   flr(bears)),
    bearMax:     Math.min(100, cel(bears)),
    rawMin:      flr(raws)   - 50,
    rawMax:      cel(raws)   + 50,
    dwImbalanceMin: Math.floor(Math.min(...dwImbalances) * 100) - 5,
    dwImbalanceMax: Math.ceil(Math.max(...dwImbalances)  * 100) + 5,
    wcl2k2mMin:  flr(wcl2k2ms) - 5,
    wcl2k2mMax:  cel(wcl2k2ms) + 5,
  }
}
