'use client'
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import {
  WinRateBar, DailyBar, DrawdownChart,
  RollingExpChart, WeekdayBar, MFEMAEScatter,
  HourHeatmap, StreakChart, MonteCarloChart, HistogramChart,
  DeltaSkewChart,
} from '@/components/Charts'
import type { HistBin } from '@/components/Charts'
import Link from 'next/link'

const DELTA_WINDOWS = [5, 10, 20, 50] as const

export default function AnalyticsPage() {
  const { stats, filteredTrades: trades } = useStore()
  const [deltaWindow, setDeltaWindow] = useState(20)

  // Streak series — running streak value per trade
  const streakData = useMemo(() => {
    let cur = 0
    return trades.map((t, i) => {
      if (t['Net PnL'] > 0)      cur = cur > 0 ? cur + 1 :  1
      else if (t['Net PnL'] < 0) cur = cur < 0 ? cur - 1 : -1
      else                       cur = 0
      return { trade: i + 1, streak: cur }
    })
  }, [trades])

  // Monte Carlo simulation — 1000 resampled equity curves
  const monteCarlo = useMemo(() => {
    const pnls = trades.map(t => t['Net PnL'])
    const n = pnls.length
    if (n < 10) return null
    const N_SIMS = 1000
    const simPaths: number[][] = []
    const finals: number[] = []
    for (let i = 0; i < N_SIMS; i++) {
      let cum = 0
      const path: number[] = [0]
      for (let j = 0; j < n; j++) {
        cum += pnls[Math.floor(Math.random() * n)]
        path.push(cum)
      }
      simPaths.push(path)
      finals.push(cum)
    }
    // Sample up to 100 evenly-spaced points for the chart
    const step = Math.max(1, Math.floor(n / 100))
    const chartData = []
    for (let i = 0; i <= n; i += step) {
      const vals = simPaths.map(p => p[i]).sort((a, b) => a - b)
      const q = (pct: number) => vals[Math.max(0, Math.floor(pct * vals.length) - 1)]
      chartData.push({ trade: i, p5: q(0.05), p25: q(0.25), p50: q(0.50), p75: q(0.75), p95: q(0.95) })
    }
    finals.sort((a, b) => a - b)
    const qf = (pct: number) => finals[Math.max(0, Math.floor(pct * finals.length) - 1)]
    return {
      chartData,
      median:     qf(0.50),
      worstCase:  qf(0.05),
      bestCase:   qf(0.95),
      profitProb: parseFloat((finals.filter(f => f > 0).length / N_SIMS * 100).toFixed(1)),
    }
  }, [trades])

  // Delta skew — per-trade Delta% with configurable rolling average window
  const deltaSkewData = useMemo(() => {
    return trades.map((t, i) => {
      const slice = trades.slice(Math.max(0, i - deltaWindow + 1), i + 1)
      const avg = slice.reduce((s, tr) => s + tr.market['Delta%'] * 100, 0) / slice.length
      return {
        trade: i + 1,
        delta: parseFloat((t.market['Delta%'] * 100).toFixed(1)),
        avg: parseFloat(avg.toFixed(1)),
        win: t['Net PnL'] > 0,
      }
    })
  }, [trades, deltaWindow])

  // MFE/MAE scatter data
  const scatterData = useMemo(() => trades.map(t => ({
    mfe: t['Max Open Profit (C)'],
    mae: Math.abs(t['Max Open Loss (C)']),
    pnl: t['Net PnL'],
    win: t['Net PnL'] > 0,
  })), [trades])

  // Distribution histograms
  const pnlHistogram = useMemo((): HistBin[] => {
    if (!trades.length) return []
    const pnls = trades.map(t => t['Net PnL'])
    const lo = Math.min(...pnls), hi = Math.max(...pnls)
    if (lo === hi) return []
    const N = 20
    const size = (hi - lo) / N
    const bins = new Array(N).fill(0)
    for (const v of pnls) bins[Math.min(N - 1, Math.floor((v - lo) / size))]++
    return bins.map((count, i) => {
      const center = lo + (i + 0.5) * size
      return { label: `$${center.toFixed(0)}`, count, value: center }
    })
  }, [trades])

  const mfeHistogram = useMemo((): HistBin[] => {
    if (!trades.length) return []
    const vals = trades.map(t => t['Max Open Profit (C)']).filter(v => v > 0)
    if (!vals.length) return []
    const hi = Math.max(...vals)
    const N = 15
    const size = hi / N
    const bins = new Array(N).fill(0)
    for (const v of vals) bins[Math.min(N - 1, Math.floor(v / size))]++
    return bins.map((count, i) => ({
      label: `$${((i + 0.5) * size).toFixed(0)}`, count, value: (i + 0.5) * size,
    }))
  }, [trades])

  const maeHistogram = useMemo((): HistBin[] => {
    if (!trades.length) return []
    const vals = trades.map(t => Math.abs(t['Max Open Loss (C)'])).filter(v => v > 0)
    if (!vals.length) return []
    const hi = Math.max(...vals)
    const N = 15
    const size = hi / N
    const bins = new Array(N).fill(0)
    for (const v of vals) bins[Math.min(N - 1, Math.floor(v / size))]++
    return bins.map((count, i) => ({
      label: `$${((i + 0.5) * size).toFixed(0)}`, count, value: (i + 0.5) * size,
    }))
  }, [trades])

  if (!stats) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12 }}>No data loaded</div>
        <Link href="/import" className="btn btn-primary">Import data</Link>
      </div>
    )
  }

  const s = stats

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Summary row */}
      <div className="g6">
        {[
          { label: 'Win rate',      val: `${s.winRate}%`,                   cls: s.winRate >= 55 ? 'pos' : 'neg' },
          { label: 'Net PnL',       val: `$${s.netPnL.toFixed(2)}`,         cls: s.netPnL >= 0 ? 'pos' : 'neg' },
          { label: 'Max drawdown',  val: `$${s.maxDrawdown.toFixed(2)}`,    cls: 'neg' },
          { label: 'Max runup',     val: `+$${s.maxRunup.toFixed(2)}`,      cls: 'pos' },
          { label: 'Best day',      val: `+$${s.bestDay?.netPnL.toFixed(0) ?? 0}`, cls: 'pos' },
          { label: 'Worst day',     val: `$${s.worstDay?.netPnL.toFixed(0) ?? 0}`, cls: 'neg' },
        ].map(m => (
          <div key={m.label} className="card" style={{ padding: '9px 11px' }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 17, fontWeight: 500 }} className={m.cls}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Risk metrics row */}
      <div className="g6">
        {[
          {
            label: 'Sharpe ratio',
            val: s.sharpe.toFixed(2),
            cls: s.sharpe >= 1 ? 'pos' : s.sharpe >= 0 ? 'neu' : 'neg',
            sub: 'target ≥ 1.0',
          },
          {
            label: 'Sortino ratio',
            val: s.sortino.toFixed(2),
            cls: s.sortino >= 1.5 ? 'pos' : s.sortino >= 0 ? 'neu' : 'neg',
            sub: 'target ≥ 1.5',
          },
          {
            label: 'Calmar ratio',
            val: s.calmar.toFixed(2),
            cls: s.calmar >= 1 ? 'pos' : s.calmar >= 0 ? 'neu' : 'neg',
            sub: 'ann. return / dd',
          },
          {
            label: 'Recovery factor',
            val: s.recoveryFactor.toFixed(2),
            cls: s.recoveryFactor >= 2 ? 'pos' : s.recoveryFactor >= 1 ? 'neu' : 'neg',
            sub: 'net PnL / |dd|',
          },
          {
            label: 'MFE capture',
            val: `${s.avgMFECapture.toFixed(1)}%`,
            cls: s.avgMFECapture >= 50 ? 'pos' : s.avgMFECapture >= 25 ? 'neu' : 'neg',
            sub: 'avg % of move kept',
          },
          {
            label: 'Daily std dev',
            val: `$${s.stdDevDaily.toFixed(0)}`,
            cls: 'neu',
            sub: `avg $${s.avgDailyReturn.toFixed(0)}/day`,
          },
        ].map(m => (
          <div key={m.label} className="card" style={{ padding: '9px 11px' }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 17, fontWeight: 500 }} className={m.cls}>{m.val}</div>
            <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Equity + Drawdown */}
      <div className="g2">
        <div className="card">
          <div className="card-title">
            Drawdown analysis
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
              — blue: equity · red dashed: drawdown from peak
            </span>
          </div>
          <div style={{ height: 150 }}>
            <DrawdownChart data={s.drawdownCurve} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            Rolling expectancy
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>20-trade window</span>
          </div>
          <div style={{ height: 150 }}>
            <RollingExpChart data={s.rollingExpectancy} />
          </div>
          <div className="insight" style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--amber)' }}>Reading: </strong>
            When the purple line is above $0 your last 20 trades were net positive. Watch for it crossing below $0 — that's your early warning.
          </div>
        </div>
      </div>

      {/* Setup + Time bucket */}
      <div className="g2">
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">Setup performance</div>
          <div style={{ overflowY: 'auto', maxHeight: 340 }}>
            {s.setupStats.map(ss => (
              <div key={ss.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, color: 'var(--t1)', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ss.name}</span>
                <span style={{ fontSize: 9, color: 'var(--t3)', width: 20 }}>{ss.trades}T</span>
                <div style={{ flex: 1, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${ss.winRate}%`,
                    background: ss.winRate >= 60 ? 'var(--green)' : ss.winRate >= 45 ? 'var(--amber)' : 'var(--red)' }} />
                </div>
                <span style={{ fontSize: 10, width: 34, textAlign: 'right',
                  color: ss.winRate >= 60 ? 'var(--green)' : ss.winRate >= 45 ? 'var(--amber)' : 'var(--red)' }}>{ss.winRate}%</span>
                <span style={{ fontSize: 10, width: 52, textAlign: 'right', fontFamily: 'monospace' }}
                  className={ss.netPnL >= 0 ? 'pos' : 'neg'}>
                  {ss.netPnL >= 0 ? '+' : ''}${ss.netPnL.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
          <div className="insight" style={{ marginTop: 10 }}>
            <strong style={{ color: 'var(--amber)' }}>Edge: </strong>
            {s.setupStats[0]?.name} leads with {s.setupStats[0]?.winRate}% WR on {s.setupStats[0]?.trades} trades.
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">Time bucket performance</div>
          <div style={{ overflowY: 'auto', maxHeight: 340 }}>
            {s.timeBuckets.filter(b => b.trades > 0).map(tb => (
              <div key={tb.bucket} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, color: 'var(--t2)', width: 80, flexShrink: 0 }}>{tb.bucket}</span>
                <span style={{ fontSize: 9, color: 'var(--t3)', width: 20 }}>{tb.trades}T</span>
                <div style={{ flex: 1, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${tb.winRate}%`,
                    background: tb.winRate >= 65 ? 'var(--green)' : tb.winRate >= 45 ? 'var(--amber)' : 'var(--red)' }} />
                </div>
                <span style={{ fontSize: 10, width: 34, textAlign: 'right',
                  color: tb.winRate >= 65 ? 'var(--green)' : tb.winRate >= 45 ? 'var(--amber)' : 'var(--red)' }}>{tb.winRate}%</span>
                <span style={{ fontSize: 10, width: 52, textAlign: 'right', fontFamily: 'monospace' }}
                  className={tb.netPnL >= 0 ? 'pos' : 'neg'}>
                  {tb.netPnL >= 0 ? '+' : ''}${tb.netPnL.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hour heatmap */}
      <div className="card">
        <div className="card-title">
          Hour heatmap
          <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
            brightness = volume · color = win rate
          </span>
        </div>
        <HourHeatmap data={s.timeBuckets.filter(b => b.trades > 0).map(b => ({
          bucket: b.bucket,
          winRate: b.winRate,
          trades: b.trades,
          netPnL: b.netPnL,
        }))} />
      </div>

      {/* Wave + E8 */}
      <div className="g3">
        <div className="card">
          <div className="card-title">Wave alignment vs win rate</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['2kWave','2mWave','30mWave','30sWave'].map(wave => {
              const green = s.waveStats.find(w => w.wave === wave && w.state === 'Green')
              const red   = s.waveStats.find(w => w.wave === wave && w.state === 'Red')
              return (
                <div key={wave} style={{ background: 'var(--bg2)', borderRadius: 7, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--t1)', marginBottom: 6 }}>{wave}</div>
                  {[{ label:'Green', d: green }, { label:'Red', d: red }].map(({ label, d }) => (
                    <div key={label} style={{ marginBottom: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
                        <span style={{ color: label === 'Green' ? 'var(--green)' : 'var(--red)' }}>{label}</span>
                        <span style={{ color: 'var(--t3)' }}>{d?.trades ?? 0}T · {d?.winRate ?? 0}%</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d?.winRate ?? 0}%`,
                          background: (d?.winRate ?? 0) >= 60 ? 'var(--green)' : (d?.winRate ?? 0) >= 40 ? 'var(--amber)' : 'var(--red)', borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">E8 vs 2kWCL & 2mCL</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 4 }}>vs 2kWCL</div>
            <div style={{ height: 90 }}>
              <WinRateBar data={s.e8kBuckets.filter(b => b.trades > 0)} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 4 }}>vs 2mCL</div>
            <div style={{ height: 90 }}>
              <WinRateBar data={s.e8mBuckets.filter(b => b.trades > 0)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Delta% at entry</div>
          <div style={{ height: 130 }}>
            <WinRateBar data={s.deltaBuckets.filter(b => b.trades > 0)} />
          </div>
          <div className="insight" style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--amber)' }}>Edge: </strong>
            {(() => {
              const best  = [...s.deltaBuckets].filter(b => b.trades >= 2).sort((a,b) => b.winRate - a.winRate)[0]
              const worst = [...s.deltaBuckets].filter(b => b.trades >= 2).sort((a,b) => a.winRate - b.winRate)[0]
              return `${best?.bucket} = ${best?.winRate}% WR. ${worst?.bucket} = ${worst?.winRate}%.`
            })()}
          </div>
        </div>
      </div>

      {/* Weekday + Streaks */}
      <div className="g2">
        <div className="card">
          <div className="card-title">Performance by weekday</div>
          <div style={{ height: 150 }}>
            <WeekdayBar data={s.weekdayStats} />
          </div>
          <div className="insight" style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--amber)' }}>Edge: </strong>
            {(() => {
              const best  = [...s.weekdayStats].sort((a,b) => b.winRate - a.winRate)[0]
              const worst = [...s.weekdayStats].filter(d => d.trades > 0).sort((a,b) => a.netPnL - b.netPnL)[0]
              return `${best?.day} best WR (${best?.winRate}%). ${worst?.day} biggest drag ($${worst?.netPnL.toFixed(0)}).`
            })()}
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Consecutive wins / losses
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
              green = win streak · red = loss streak
            </span>
          </div>
          <div style={{ height: 150 }}>
            <StreakChart data={streakData} />
          </div>
          <div className="insight" style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--amber)' }}>Edge: </strong>
            Longest win streak: {s.longestWinStreak}. Longest loss streak: {s.longestLossStreak}.
          </div>
        </div>
      </div>

      {/* MFE/MAE Scatter + Daily PnL */}
      <div className="g2">
        <div className="card">
          <div className="card-title">
            MFE vs MAE scatter
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
              green = winner · red = loser
            </span>
          </div>
          <div style={{ height: 180 }}>
            <MFEMAEScatter data={scatterData} />
          </div>
          <div className="insight" style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--amber)' }}>Reading: </strong>
            Winners clustered top-right = high MFE, high MAE — trades that work after heat. Losers bottom-left = stopped early. Look for winners with low MAE — those are clean entries.
          </div>
        </div>

        <div className="card">
          <div className="card-title">Daily PnL</div>
          <div style={{ height: 180 }}>
            <DailyBar data={s.dailyPnL} />
          </div>
        </div>
      </div>


      {/* Delta skew chart */}
      <div className="card">
        <div className="card-title">
          Delta% at entry — trade by trade
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 400, color: 'var(--t3)', fontSize: 9 }}>
              green = winner · red = loser · amber = rolling avg
            </span>
            <div style={{ display: 'flex', gap: 3 }}>
              {DELTA_WINDOWS.map(w => (
                <button key={w} onClick={() => setDeltaWindow(w)} style={{
                  padding: '2px 7px', fontSize: 9, borderRadius: 4,
                  border: '1px solid',
                  borderColor: deltaWindow === w ? 'rgba(245,158,11,0.5)' : 'var(--border)',
                  background: deltaWindow === w ? 'rgba(245,158,11,0.12)' : 'var(--bg3)',
                  color: deltaWindow === w ? 'var(--amber)' : 'var(--t3)',
                  cursor: 'pointer', fontWeight: deltaWindow === w ? 600 : 400,
                }}>
                  {w} trades
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: 160 }}>
          <DeltaSkewChart data={deltaSkewData} />
        </div>
        <div className="insight" style={{ marginTop: 8 }}>
          <strong style={{ color: 'var(--amber)' }}>Reading: </strong>
          Amber line drifting positive = you tend to enter on ASK pressure. Negative = BID pressure.
          Green bars above zero = winning entries with positive delta. Look for clusters of green in a consistent zone.
          Use a shorter window ({DELTA_WINDOWS[0]}–{DELTA_WINDOWS[1]} trades) to catch intraday shifts; longer ({DELTA_WINDOWS[2]}–{DELTA_WINDOWS[3]} trades) to see overall tendency.
        </div>
      </div>

      {/* Distribution histograms */}
      <div className="g3">
        <div className="card">
          <div className="card-title">
            PnL distribution
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
              green = wins · red = losses
            </span>
          </div>
          <div style={{ height: 140 }}>
            <HistogramChart data={pnlHistogram} colorMode="pnl" />
          </div>
          <div className="insight" style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--amber)' }}>Reading: </strong>
            A right-skewed peak means most wins cluster above the loss zone — positive expectancy shape.
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            MFE distribution
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
              max favorable excursion
            </span>
          </div>
          <div style={{ height: 140 }}>
            <HistogramChart data={mfeHistogram} colorMode="blue" />
          </div>
          <div className="insight" style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--amber)' }}>Reading: </strong>
            Where most MFEs cluster is your typical winner potential. Compare against your average exit.
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            MAE distribution
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
              max adverse excursion
            </span>
          </div>
          <div style={{ height: 140 }}>
            <HistogramChart data={maeHistogram} colorMode="amber" />
          </div>
          <div className="insight" style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--amber)' }}>Reading: </strong>
            Heavy right tail = trades going deep before turning. Tight MAE cluster = clean entries.
          </div>
        </div>
      </div>

      {/* Long vs Short deep dive */}
      <div className="g2">
        {[
          { label: 'Long trades',  d: s.longStats,  c: 'var(--green)', dim: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.15)' },
          { label: 'Short trades', d: s.shortStats, c: 'var(--red)',   dim: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.15)' },
        ].map(({ label, d, c, dim, border }) => (
          <div key={label} className="card" style={{ background: dim, borderColor: border }}>
            <div className="card-title" style={{ color: c }}>{label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[
                { k: 'Trades',   v: String(d.trades) },
                { k: 'Win rate', v: `${d.winRate}%`,                           c: d.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
                { k: 'Net PnL',  v: `${d.netPnL >= 0 ? '+' : ''}$${d.netPnL.toFixed(0)}`, c: d.netPnL >= 0 ? 'var(--green)' : 'var(--red)' },
                { k: 'Wins',     v: String(d.wins),                            c: 'var(--green)' },
              ].map(m => (
                <div key={m.k} style={{ background: 'var(--bg2)', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.k}</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: (m as any).c ?? 'var(--t1)' }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginBottom: 3 }}>
                <span>Win rate</span><span>{d.winRate}%</span>
              </div>
              <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.winRate}%`, background: c, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AM vs PM Session Performance */}
      <div className="card">
        <div className="card-title">Session performance — AM vs PM</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {s.sessionStats.map(sess => {
            const c = sess.session === 'AM' ? 'var(--blue)' : 'var(--purple)'
            const dim = sess.session === 'AM' ? 'rgba(59,130,246,0.06)' : 'rgba(167,139,250,0.06)'
            const border = sess.session === 'AM' ? 'rgba(59,130,246,0.18)' : 'rgba(167,139,250,0.18)'
            return (
              <div key={sess.session} style={{ background: dim, border: `1px solid ${border}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c }}>
                    {sess.session === 'AM' ? 'AM Session' : 'PM Session'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                    {sess.session === 'AM' ? 'before 12:00' : '12:00 and after'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
                  {[
                    { k: 'Trades',   v: String(sess.trades),                                                              vc: 'var(--t1)' },
                    { k: 'Win rate', v: `${sess.winRate}%`,                                                               vc: sess.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
                    { k: 'Net PnL',  v: `${sess.netPnL >= 0 ? '+' : ''}$${sess.netPnL.toFixed(0)}`,                      vc: sess.netPnL >= 0 ? 'var(--green)' : 'var(--red)' },
                    { k: 'Avg PnL',  v: `${sess.avgPnL >= 0 ? '+' : ''}$${sess.avgPnL.toFixed(2)}`,                      vc: sess.avgPnL >= 0 ? 'var(--green)' : 'var(--red)' },
                  ].map(m => (
                    <div key={m.k} style={{ background: 'var(--bg2)', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.k}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: m.vc }}>{m.v}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginBottom: 3 }}>
                    <span>Win rate</span><span>{sess.winRate}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${sess.winRate}%`, background: c, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Comparison bar */}
        {s.sessionStats[0] && s.sessionStats[1] && s.sessionStats[0].trades + s.sessionStats[1].trades > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginBottom: 4 }}>
              <span>AM {s.sessionStats[0].trades}T ({((s.sessionStats[0].trades / (s.sessionStats[0].trades + s.sessionStats[1].trades)) * 100).toFixed(0)}%)</span>
              <span>PM {s.sessionStats[1].trades}T ({((s.sessionStats[1].trades / (s.sessionStats[0].trades + s.sessionStats[1].trades)) * 100).toFixed(0)}%)</span>
            </div>
            <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
              <div style={{
                height: '100%',
                width: `${(s.sessionStats[0].trades / (s.sessionStats[0].trades + s.sessionStats[1].trades)) * 100}%`,
                background: 'var(--blue)', borderRadius: '3px 0 0 3px',
              }} />
              <div style={{
                height: '100%',
                flex: 1,
                background: 'var(--purple)', borderRadius: '0 3px 3px 0',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Monte Carlo simulation */}
      {monteCarlo && (
        <div className="card">
          <div className="card-title">
            Monte Carlo simulation
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
              1,000 resampled equity curves · {trades.length} trades
            </span>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Median outcome',    val: `${monteCarlo.median >= 0 ? '+' : ''}$${monteCarlo.median.toFixed(0)}`,    cls: monteCarlo.median >= 0 ? 'pos' : 'neg', sub: '50th percentile' },
              { label: 'Worst case (5%)',   val: `${monteCarlo.worstCase >= 0 ? '+' : ''}$${monteCarlo.worstCase.toFixed(0)}`, cls: monteCarlo.worstCase >= 0 ? 'pos' : 'neg', sub: 'bottom 5% of runs' },
              { label: 'Best case (95%)',   val: `+$${monteCarlo.bestCase.toFixed(0)}`,   cls: 'pos', sub: 'top 5% of runs' },
              { label: 'Probability of profit', val: `${monteCarlo.profitProb}%`, cls: monteCarlo.profitProb >= 60 ? 'pos' : monteCarlo.profitProb >= 40 ? 'neu' : 'neg', sub: 'of simulations end positive' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--bg2)', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 2 }} className={m.cls}>{m.val}</div>
                <div style={{ fontSize: 9, color: 'var(--t3)' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Fan chart */}
          <div style={{ height: 200 }}>
            <MonteCarloChart data={monteCarlo.chartData} />
          </div>

          <div className="insight" style={{ marginTop: 10 }}>
            <strong style={{ color: 'var(--amber)' }}>Reading: </strong>
            Blue solid = median path. Inner blue lines = 25th–75th percentile range. Green dashed = top 5% outcome. Red dashed = worst 5% outcome.
            A wide fan signals high variance — your results are sensitive to trade sequence. A tight fan signals consistency.
          </div>
        </div>
      )}

    </div>
  )
}
