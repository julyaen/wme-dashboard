'use client'
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import {
  WinRateBar, DailyBar, DrawdownChart,
  RollingExpChart, WeekdayBar, MFEMAEScatter,
  HourHeatmap, StreakChart,
} from '@/components/Charts'
import Link from 'next/link'

export default function AnalyticsPage() {
  const { stats, filteredTrades: trades } = useStore()

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

  // MFE/MAE scatter data
  const scatterData = useMemo(() => trades.map(t => ({
    mfe: t['Max Open Profit (C)'],
    mae: Math.abs(t['Max Open Loss (C)']),
    pnl: t['Net PnL'],
    win: t['Net PnL'] > 0,
  })), [trades])

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 7 }}>
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

      {/* Equity + Drawdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card">
          <div className="card-title">Setup performance</div>
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
          <div className="insight" style={{ marginTop: 10 }}>
            <strong style={{ color: 'var(--amber)' }}>Edge: </strong>
            {s.setupStats[0]?.name} leads with {s.setupStats[0]?.winRate}% WR on {s.setupStats[0]?.trades} trades.
          </div>
        </div>

        <div className="card">
          <div className="card-title">Time bucket performance</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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


      {/* Long vs Short deep dive */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

    </div>
  )
}
