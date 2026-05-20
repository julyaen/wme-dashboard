'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { EquityCurve, DailyBar, HourHeatmap } from '@/components/Charts'
import { fmtDt, fmtDuration } from '@/lib/parser'
import type { Trade } from '@/types'
import Link from 'next/link'

function MetricCard({ label, val, cls, sub }: { label: string; val: string; cls: string; sub: string }) {
  return (
    <div className="card" style={{ padding: '9px 11px' }}>
      <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 500 }} className={cls}>{val}</div>
      <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { filteredTrades: trades, trades: allTrades, stats } = useStore()
  const [selected, setSelected] = useState<Trade | null>(null)

  if (!allTrades.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 12 }}>
        <div style={{ fontSize: 40 }}>📂</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>No data loaded</div>
        <div style={{ color: 'var(--t3)', fontSize: 12 }}>Upload your WME normalized xlsx to get started</div>
        <Link href="/import" className="btn btn-primary" style={{ marginTop: 8 }}>Import data</Link>
      </div>
    )
  }

  if (!trades.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 8 }}>
        <div style={{ fontSize: 32 }}>🔍</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>No trades match current filters</div>
        <div style={{ color: 'var(--t3)', fontSize: 12 }}>Adjust or reset your filters to see data</div>
      </div>
    )
  }

  const s = stats!
  const t = selected

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Row 1: Core metrics ──────────────────────────────────────────── */}
      <div className="g8">
        <MetricCard label="Net PnL"       val={`$${s.netPnL.toFixed(2)}`}       cls={s.netPnL >= 0 ? 'pos' : 'neg'}            sub={`${trades.length} trades`} />
        <MetricCard label="Win rate"      val={`${s.winRate}%`}                  cls="neu"                                       sub={`${s.winners}W · ${s.losers}L`} />
        <MetricCard label="Avg winner"    val={`$${s.avgWinner.toFixed(2)}`}     cls="pos"                                       sub="per trade" />
        <MetricCard label="Avg loser"     val={`-$${s.avgLoser.toFixed(2)}`}     cls="neg"                                       sub="per trade" />
        <MetricCard label="Profit factor" val={s.profitFactor.toFixed(2)}        cls={s.profitFactor >= 1.5 ? 'pos' : 'neg'}    sub="target ≥1.5" />
        <MetricCard label="Expectancy"    val={`$${s.expectancy.toFixed(2)}`}    cls={s.expectancy >= 0 ? 'pos' : 'neg'}        sub="per trade" />
        <MetricCard label="Sharpe"        val={s.sharpe.toFixed(2)}              cls={s.sharpe >= 1 ? 'pos' : s.sharpe >= 0 ? 'neu' : 'neg'} sub="target ≥1.0" />
        <MetricCard label="Recovery"      val={s.recoveryFactor.toFixed(2)}      cls={s.recoveryFactor >= 2 ? 'pos' : s.recoveryFactor >= 1 ? 'neu' : 'neg'} sub="net / |dd|" />
      </div>

      {/* ── Row 2: Weekly / Monthly / Streak / Long-Short ───────────────── */}
      <div className="g4">

        {/* Weekly PnL */}
        <div className="card">
          <div className="card-title">Weekly PnL</div>
          <div style={{ overflowY: 'auto', maxHeight: 280 }}>
            {s.weeklyPnL.length === 0
              ? <div style={{ color: 'var(--t3)', fontSize: 11 }}>—</div>
              : s.weeklyPnL.map(w => (
                <div key={w.week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--t2)' }}>{w.week}</span>
                  <span style={{ fontSize: 10, color: 'var(--t3)' }}>{w.trades}T · {w.winRate}%</span>
                  <span style={{ fontSize: 11, fontWeight: 500, fontFamily: 'monospace' }} className={w.netPnL >= 0 ? 'pos' : 'neg'}>
                    {w.netPnL >= 0 ? '+' : ''}${w.netPnL.toFixed(0)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Monthly PnL */}
        <div className="card">
          <div className="card-title">Monthly PnL</div>
          <div style={{ overflowY: 'auto', maxHeight: 280 }}>
            {s.monthlyPnL.length === 0
              ? <div style={{ color: 'var(--t3)', fontSize: 11 }}>—</div>
              : s.monthlyPnL.map(m => (
                <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--t2)' }}>
                    {new Date(m.month + '-01').toLocaleString('en-US', { month: 'short', year: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--t3)' }}>{m.trades}T · {m.winRate}%</span>
                  <span style={{ fontSize: 11, fontWeight: 500, fontFamily: 'monospace' }} className={m.netPnL >= 0 ? 'pos' : 'neg'}>
                    {m.netPnL >= 0 ? '+' : ''}${m.netPnL.toFixed(0)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Streaks + Long/Short */}
        <div className="card">
          <div className="card-title">Streaks</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
            <div style={{ background: 'var(--bg2)', borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 3 }}>LONGEST WIN</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--green)' }}>{s.longestWinStreak}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)' }}>in a row</div>
            </div>
            <div style={{ background: 'var(--bg2)', borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 3 }}>LONGEST LOSS</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--red)' }}>{s.longestLossStreak}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)' }}>in a row</div>
            </div>
          </div>
          {/* Streak dots */}
          <SectionLabel>Last 15 trades</SectionLabel>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {trades.slice(-15).map((tr, i) => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: 3,
                background: tr['Net PnL'] > 0 ? 'var(--green)' : tr['Net PnL'] < 0 ? 'var(--red)' : 'var(--bg4)',
                opacity: 0.85,
              }} title={`${tr['Net PnL'] >= 0 ? '+' : ''}$${tr['Net PnL'].toFixed(2)}`} />
            ))}
          </div>
        </div>

        {/* Long vs Short */}
        <div className="card">
          <div className="card-title">Long vs Short</div>
          {[
            { label: 'Long',  d: s.longStats,  c: 'var(--green)' },
            { label: 'Short', d: s.shortStats, c: 'var(--red)' },
          ].map(({ label, d, c }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: c }}>{label}</span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{d.trades} trades</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <div style={{ background: 'var(--bg2)', borderRadius: 5, padding: '5px 7px' }}>
                  <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 2 }}>WIN RATE</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: d.winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>{d.winRate}%</div>
                </div>
                <div style={{ background: 'var(--bg2)', borderRadius: 5, padding: '5px 7px' }}>
                  <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 2 }}>NET PnL</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }} className={d.netPnL >= 0 ? 'pos' : 'neg'}>
                    {d.netPnL >= 0 ? '+' : ''}${d.netPnL.toFixed(0)}
                  </div>
                </div>
              </div>
              {/* Win rate bar */}
              <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.winRate}%`, background: c, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Best / Worst setup ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {[
          { label: '★ Best setup',  d: s.bestSetup,  c: 'var(--green)', dim: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
          { label: '↓ Worst setup', d: s.worstSetup, c: 'var(--red)',   dim: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
        ].map(({ label, d, c, dim, border }) => (
          <div key={label} className="card" style={{ background: dim, borderColor: border }}>
            <div className="card-title" style={{ color: c }}>{label}</div>
            {!d ? (
              <div style={{ color: 'var(--t3)', fontSize: 11 }}>Need ≥2 trades per setup</div>
            ) : (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', flex: 1 }}>{d.name}</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>TRADES</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{d.trades}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>WIN RATE</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: d.winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>{d.winRate}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>NET PnL</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }} className={d.netPnL >= 0 ? 'pos' : 'neg'}>
                    {d.netPnL >= 0 ? '+' : ''}${d.netPnL.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>AVG MFE</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--green)' }}>+${d.avgMFE.toFixed(1)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>AVG MAE</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--red)' }}>${d.avgMAE.toFixed(1)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Row 4: Session Performance + Hour Heatmap ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>

        {/* AM vs PM */}
        <div className="card">
          <div className="card-title">Session performance — AM vs PM</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {s.sessionStats.map(sess => {
              const c      = sess.session === 'AM' ? 'var(--blue)' : 'var(--purple)'
              const dim    = sess.session === 'AM' ? 'rgba(59,130,246,0.06)' : 'rgba(167,139,250,0.06)'
              const border = sess.session === 'AM' ? 'rgba(59,130,246,0.18)' : 'rgba(167,139,250,0.18)'
              return (
                <div key={sess.session} style={{ background: dim, border: `1px solid ${border}`, borderRadius: 7, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c }}>{sess.session} Session</span>
                    <span style={{ fontSize: 9, color: 'var(--t3)' }}>{sess.session === 'AM' ? 'before 12:00' : '≥12:00'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {[
                      { k: 'Trades',   v: String(sess.trades),                                              vc: 'var(--t1)' },
                      { k: 'Win rate', v: `${sess.winRate}%`,                                               vc: sess.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
                      { k: 'Net PnL',  v: `${sess.netPnL >= 0 ? '+' : ''}$${sess.netPnL.toFixed(0)}`,      vc: sess.netPnL >= 0 ? 'var(--green)' : 'var(--red)' },
                      { k: 'Avg PnL',  v: `${sess.avgPnL >= 0 ? '+' : ''}$${sess.avgPnL.toFixed(2)}`,      vc: sess.avgPnL >= 0 ? 'var(--green)' : 'var(--red)' },
                    ].map(m => (
                      <div key={m.k} style={{ background: 'var(--bg2)', borderRadius: 5, padding: '5px 7px' }}>
                        <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.k}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: m.vc }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${sess.winRate}%`, background: c, borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {s.sessionStats[0] && s.sessionStats[1] && (s.sessionStats[0].trades + s.sessionStats[1].trades) > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginBottom: 4 }}>
                <span>AM {s.sessionStats[0].trades}T</span>
                <span>PM {s.sessionStats[1].trades}T</span>
              </div>
              <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                <div style={{ height: '100%', width: `${(s.sessionStats[0].trades / (s.sessionStats[0].trades + s.sessionStats[1].trades)) * 100}%`, background: 'var(--blue)', borderRadius: '3px 0 0 3px' }} />
                <div style={{ height: '100%', flex: 1, background: 'var(--purple)', borderRadius: '0 3px 3px 0' }} />
              </div>
            </div>
          )}
        </div>

        {/* Hour heatmap */}
        <div className="card">
          <div className="card-title">
            Hour heatmap
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>brightness = volume · color = win rate</span>
          </div>
          <HourHeatmap data={s.timeBuckets.filter(b => b.trades > 0).map(b => ({
            bucket: b.bucket, winRate: b.winRate, trades: b.trades, netPnL: b.netPnL,
          }))} />
        </div>

      </div>

      {/* ── Row 5: Equity + Trade log + Context ──────────────────────────── */}
      <div className="dash-main">

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Equity curve */}
          <div className="card">
            <div className="card-title">
              Equity curve
              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--t3)', fontWeight: 400 }}>
                ${s.equityCurve[0]?.cumPnL.toFixed(0) ?? 0} → ${s.equityCurve[s.equityCurve.length-1]?.cumPnL.toFixed(0) ?? 0}
              </span>
            </div>
            <div style={{ height: 120 }}>
              <EquityCurve data={s.equityCurve} />
            </div>
          </div>

          {/* Trade log */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Trade log</div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 300 }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Setup</th><th>Type</th><th>Entry</th><th>Exit</th>
                    <th>Dur</th><th>Net PnL</th><th>MFE</th><th>MAE</th>
                    <th>2kW</th><th>Delta%</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(tr => (
                    <tr key={tr.id}
                      className={selected?.id === tr.id ? 'selected' : ''}
                      onClick={() => setSelected(tr)}
                    >
                      <td style={{ color: 'var(--t1)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.Setup}</td>
                      <td><span className={`badge ${tr['Trade Type'] === 'Long' ? 'badge-green' : 'badge-red'}`}>{tr['Trade Type'] === 'Long' ? 'L' : 'S'}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{fmtDt(tr['Entry DateTime'])}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{fmtDt(tr['Exit DateTime'])}</td>
                      <td style={{ color: 'var(--t3)' }}>{fmtDuration(tr.Duration)}</td>
                      <td className={tr['Net PnL'] >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 500 }}>
                        {tr['Net PnL'] >= 0 ? '+' : ''}${tr['Net PnL'].toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--green)', fontSize: 10 }}>+${tr['Max Open Profit (C)'].toFixed(1)}</td>
                      <td style={{ color: 'var(--red)', fontSize: 10 }}>${tr['Max Open Loss (C)'].toFixed(1)}</td>
                      <td><span className={`badge ${tr.market['2kWave'] === 'Green' ? 'badge-green' : 'badge-red'}`}>{tr.market['2kWave']}</span></td>
                      <td style={{ color: tr.market['Delta%'] >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'monospace', fontSize: 10 }}>
                        {(tr.market['Delta%'] * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily PnL */}
          <div className="card">
            <div className="card-title">Daily PnL</div>
            <div style={{ height: 110 }}>
              <DailyBar data={s.dailyPnL} />
            </div>
          </div>

        </div>

        {/* Market context panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: 687 }}>
          <div className="card-title" style={{ flexShrink: 0 }}>
            Market context at entry
            {t && <span style={{ marginLeft: 'auto', color: 'var(--t3)', fontWeight: 400, textTransform: 'none', fontSize: 10 }}>{t.Setup}</span>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

          {!t ? (
            <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 11, paddingTop: 40 }}>
              Click a trade row to inspect its market context
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Wave states */}
              <div>
                <SectionLabel>Wave alignment</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
                  {(['2kWave','2mWave','30mWave','30sWave'] as const).map(w => (
                    <div key={w} style={{
                      borderRadius: 6, padding: '6px 4px', textAlign: 'center',
                      background: t.market[w] === 'Green' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${t.market[w] === 'Green' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}>
                      <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 2 }}>{w}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: t.market[w] === 'Green' ? 'var(--green)' : 'var(--red)' }}>
                        {t.market[w]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Volume pressure */}
              <div>
                <SectionLabel>Volume pressure</SectionLabel>
                {[
                  { k: 'wASK', v: t.market.wASK, c: 'var(--green)' },
                  { k: 'wBID', v: t.market.wBID, c: 'var(--red)' },
                  { k: 'Raw ASK−BID', v: t.market['RawASK-BID'], c: t.market['RawASK-BID'] >= 0 ? 'var(--green)' : 'var(--red)' },
                  { k: 'DWask', v: t.market.DWask.toFixed(4), c: 'var(--t1)' },
                  { k: 'DWbid', v: t.market.DWbid.toFixed(4), c: 'var(--t1)' },
                  { k: 'Delta%', v: `${(t.market['Delta%'] * 100).toFixed(1)}%`, c: t.market['Delta%'] >= 0 ? 'var(--green)' : 'var(--red)' },
                ].map(r => (
                  <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                    <span style={{ color: 'var(--t2)' }}>{r.k}</span>
                    <span style={{ color: r.c, fontFamily: 'monospace', fontWeight: 500 }}>{r.v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>
                    <span>BID {(t.market['BID%'] * 100).toFixed(1)}%</span>
                    <span>ASK {(t.market['ASK%'] * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${t.market['BID%'] * 100}%`, background: 'var(--red)' }} />
                    <div style={{ width: `${t.market['ASK%'] * 100}%`, background: 'var(--green)' }} />
                  </div>
                </div>
              </div>

              {/* Volume flags */}
              <div>
                <SectionLabel>Volume flags</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[
                    { k: 'ASK>1050', v: t.market['ASK>1050'], bullish: true },
                    { k: 'BID<950',  v: t.market['BID<950'],  bullish: true },
                    { k: 'BID>1050', v: t.market['BID>1050'], bullish: false },
                    { k: 'ASK<950',  v: t.market['ASK<950'],  bullish: false },
                  ].map(f => (
                    <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', borderRadius: 5, padding: '4px 8px' }}>
                      <span style={{ fontSize: 10, color: 'var(--t2)' }}>{f.k}</span>
                      <span className={`badge ${f.v ? (f.bullish ? 'badge-green' : 'badge-red') : 'badge-gray'}`}>
                        {f.v ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EMA distances */}
              <div>
                <SectionLabel>EMA8 distances</SectionLabel>
                {[
                  { k: 'E8 vs 2kWCL', v: t.market.E8_2kCL },
                  { k: 'E8 vs 2mCL',  v: t.market.E8_2mCL },
                ].map(r => (
                  <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                    <span style={{ color: 'var(--t2)' }}>{r.k}</span>
                    <span style={{ color: r.v >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'monospace', fontWeight: 500 }}>
                      {r.v >= 0 ? '+' : ''}{r.v.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* DSS */}
              <div>
                <SectionLabel>DSS momentum</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { k: 'BullishDSS', v: t.market.BullishDSS, c: 'var(--green)' },
                    { k: 'BearishDSS', v: t.market.BearishDSS, c: 'var(--red)' },
                  ].map(d => (
                    <div key={d.k} style={{ background: 'var(--bg2)', borderRadius: 6, padding: '7px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 3 }}>{d.k}</div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: d.c }}>{d.v}</div>
                      <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d.v}%`, background: d.c, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VWAP / Bands */}
              <div>
                <SectionLabel>VWAP &amp; bands</SectionLabel>
                {[
                  { k: 'VWAP', v: t['Entry >VWAP'] },
                  { k: 'TB1',  v: t['Entry >TB1'] },
                  { k: 'TB2',  v: t['Entry >TB2'] },
                  { k: 'TB3',  v: t['Entry >TB3'] },
                  { k: 'BB1',  v: t['Entry <BB1'] },
                ].map(r => {
                  const above = r.v?.startsWith('Above')
                  return (
                    <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                      <span style={{ color: 'var(--t2)' }}>{r.k}</span>
                      <span className={`badge ${above ? 'badge-green' : 'badge-red'}`}>{above ? 'Above' : 'Below'}</span>
                    </div>
                  )
                })}
              </div>

              {/* MFE / MAE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div style={{ background: 'var(--bg2)', borderRadius: 6, padding: '7px 10px' }}>
                  <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 2 }}>MFE (max runup)</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--green)' }}>+${t['Max Open Profit (C)'].toFixed(1)}</div>
                </div>
                <div style={{ background: 'var(--bg2)', borderRadius: 6, padding: '7px 10px' }}>
                  <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 2 }}>MAE (max dd)</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--red)' }}>${t['Max Open Loss (C)'].toFixed(1)}</div>
                </div>
              </div>

            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
