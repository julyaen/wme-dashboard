'use client'
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { WinRateBar } from '@/components/Charts'
import { fmtDt, fmtDuration } from '@/lib/parser'
import TradeModal from '@/components/TradeModal'
import type { Trade } from '@/types'
import Link from 'next/link'

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 7, padding: '8px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 8, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: color ?? 'var(--t1)' }}>{value}</div>
    </div>
  )
}

export default function PlaybookPage() {
  const { filteredTrades: trades, trades: allTrades } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [modalTrade, setModalTrade] = useState<Trade | null>(null)

  const setups = useMemo(() => {
    const map = new Map<string, Trade[]>()
    for (const t of trades) {
      const s = t.Setup
      if (!map.has(s)) map.set(s, [])
      map.get(s)!.push(t)
    }
    return Array.from(map.entries())
      .map(([name, ts]) => {
        const wins    = ts.filter(t => t['Net PnL'] > 0).length
        const losses  = ts.length - wins
        const netPnL  = parseFloat(ts.reduce((a, t) => a + t['Net PnL'], 0).toFixed(2))
        const avgPnL  = parseFloat((netPnL / ts.length).toFixed(2))
        const avgMFE  = parseFloat((ts.reduce((a, t) => a + t['Max Open Profit (C)'], 0) / ts.length).toFixed(2))
        const avgMAE  = parseFloat((ts.reduce((a, t) => a + t['Max Open Loss (C)'], 0) / ts.length).toFixed(2))
        const avgDur  = ts.reduce((a, t) => a + t.Duration, 0) / ts.length
        const winRate = parseFloat((wins / ts.length * 100).toFixed(1))
        const pf      = losses > 0
          ? parseFloat(((wins * Math.abs(avgMFE)) / (losses * Math.abs(avgMAE))).toFixed(2))
          : wins > 0 ? 99 : 0

        // Wave alignment breakdown
        const wave2kGreen  = ts.filter(t => t.market['2kWave']  === 'Green').length
        const wave2mGreen  = ts.filter(t => t.market['2mWave']  === 'Green').length
        const wave30mGreen = ts.filter(t => t.market['30mWave'] === 'Green').length

        // Delta% distribution
        const avgDelta = parseFloat((ts.reduce((a, t) => a + t.market['Delta%'], 0) / ts.length * 100).toFixed(1))

        // DSS averages
        const avgBullDSS = parseFloat((ts.reduce((a, t) => a + t.market.BullishDSS, 0) / ts.length).toFixed(1))
        const avgBearDSS = parseFloat((ts.reduce((a, t) => a + t.market.BearishDSS, 0) / ts.length).toFixed(1))

        // Time bucket breakdown
        const buckets = Array.from(new Set(ts.map(t => t.market['Time Bucket']))).sort()

        return {
          name, trades: ts, count: ts.length,
          wins, losses, netPnL, avgPnL,
          avgMFE, avgMAE, avgDur, winRate, pf,
          wave2kGreen, wave2mGreen, wave30mGreen,
          avgDelta, avgBullDSS, avgBearDSS, buckets,
        }
      })
      .sort((a, b) => b.netPnL - a.netPnL)
  }, [trades])

  const activeSetup = setups.find(s => s.name === selected) ?? setups[0] ?? null

  if (!allTrades.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12 }}>No trades loaded</div>
        <Link href="/import" className="btn btn-primary">Import data</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 14, display: 'flex', gap: 12, height: 'calc(100vh - 42px)', overflow: 'hidden' }}>

      {/* Modal */}
      {modalTrade && <TradeModal trade={modalTrade} onClose={() => setModalTrade(null)} />}

      {/* LEFT — setup list */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 500, padding: '4px 0', marginBottom: 2 }}>
          {setups.length} setups · {trades.length} trades
        </div>
        {setups.map(s => {
          const isActive = (selected ?? setups[0]?.name) === s.name
          return (
            <div key={s.name} onClick={() => setSelected(s.name)}
              style={{
                background: isActive ? 'var(--bg3)' : 'var(--bg1)',
                border: `1px solid ${isActive ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                transition: 'all .15s',
              }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--t1)', marginBottom: 4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: 'var(--t3)' }}>{s.count}T · {s.winRate}%</span>
                <span className={s.netPnL >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 500 }}>
                  {s.netPnL >= 0 ? '+' : ''}${s.netPnL.toFixed(0)}
                </span>
              </div>
              {/* Mini win rate bar */}
              <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${s.winRate}%`, borderRadius: 2,
                  background: s.winRate >= 60 ? 'var(--green)' : s.winRate >= 45 ? 'var(--amber)' : 'var(--red)',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* RIGHT — setup detail */}
      {activeSetup && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Header */}
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{activeSetup.name}</div>
              <span className={`badge ${activeSetup.netPnL >= 0 ? 'badge-green' : 'badge-red'}`}>
                {activeSetup.netPnL >= 0 ? '+' : ''}${activeSetup.netPnL.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
              <StatBox label="Trades"      value={String(activeSetup.count)} />
              <StatBox label="Win rate"    value={`${activeSetup.winRate}%`}
                color={activeSetup.winRate >= 55 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="Wins"        value={String(activeSetup.wins)}  color="var(--green)" />
              <StatBox label="Losses"      value={String(activeSetup.losses)} color="var(--red)" />
              <StatBox label="Avg PnL"     value={`${activeSetup.avgPnL >= 0 ? '+' : ''}$${activeSetup.avgPnL.toFixed(2)}`}
                color={activeSetup.avgPnL >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="Avg MFE"     value={`+$${activeSetup.avgMFE.toFixed(1)}`} color="var(--green)" />
              <StatBox label="Avg MAE"     value={`$${activeSetup.avgMAE.toFixed(1)}`}   color="var(--red)" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

            {/* Market context profile */}
            <div className="card">
              <div className="card-title">Market context profile</div>

              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>Wave alignment (% Green)</div>
              {[
                { label: '2kWave Green',  pct: activeSetup.wave2kGreen  / activeSetup.count * 100 },
                { label: '2mWave Green',  pct: activeSetup.wave2mGreen  / activeSetup.count * 100 },
                { label: '30mWave Green', pct: activeSetup.wave30mGreen / activeSetup.count * 100 },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: 'var(--t2)', width: 110 }}>{r.label}</span>
                  <div style={{ flex: 1, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.pct}%`, background: r.pct >= 60 ? 'var(--green)' : 'var(--amber)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--t3)', width: 30, textAlign: 'right' }}>{r.pct.toFixed(0)}%</span>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>DSS averages at entry</div>
              {[
                { label: 'BullishDSS avg', val: activeSetup.avgBullDSS, c: 'var(--green)' },
                { label: 'BearishDSS avg', val: activeSetup.avgBearDSS, c: 'var(--red)' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: 'var(--t2)', width: 110 }}>{r.label}</span>
                  <div style={{ flex: 1, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.val}%`, background: r.c, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10, color: r.c, width: 30, textAlign: 'right', fontWeight: 500 }}>{r.val}</span>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--t2)' }}>Avg Delta% at entry</span>
                <span style={{ color: activeSetup.avgDelta >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'monospace', fontWeight: 500 }}>
                  {activeSetup.avgDelta >= 0 ? '+' : ''}{activeSetup.avgDelta}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                <span style={{ color: 'var(--t2)' }}>Avg duration</span>
                <span style={{ color: 'var(--t1)', fontFamily: 'monospace' }}>{fmtDuration(activeSetup.avgDur)}</span>
              </div>
            </div>

            {/* Win rate by time bucket */}
            <div className="card">
              <div className="card-title">Win rate by time bucket</div>
              <div style={{ height: 160 }}>
                <WinRateBar data={(() => {
                  const bucketMap = new Map<string, { wins: number; trades: number; netPnL: number }>()
                  for (const t of activeSetup.trades) {
                    const b = t.market['Time Bucket']
                    if (!bucketMap.has(b)) bucketMap.set(b, { wins: 0, trades: 0, netPnL: 0 })
                    const entry = bucketMap.get(b)!
                    entry.trades++
                    entry.netPnL += t['Net PnL']
                    if (t['Net PnL'] > 0) entry.wins++
                  }
                  return Array.from(bucketMap.entries())
                    .sort(([a],[b]) => a.localeCompare(b))
                    .map(([bucket, d]) => ({
                      bucket,
                      winRate: parseFloat((d.wins / d.trades * 100).toFixed(1)),
                      trades: d.trades,
                      netPnL: parseFloat(d.netPnL.toFixed(2)),
                    }))
                })()} />
              </div>
            </div>
          </div>

          {/* Trade list for this setup */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                Trades — {activeSetup.name}
                <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--t3)' }}>
                  click ⊞ for detail
                </span>
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 280 }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Entry</th><th>Type</th><th>Net PnL</th>
                    <th>MFE</th><th>MAE</th><th>2kW</th><th>Delta%</th><th>BullDSS</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSetup.trades.map(tr => (
                    <tr key={tr.id}>
                      <td onClick={() => setModalTrade(tr)}
                        style={{ textAlign: 'center', cursor: 'pointer' }}>
                        <span style={{
                          fontSize: 10, color: 'var(--t3)', padding: '1px 5px',
                          borderRadius: 3, border: '1px solid var(--border)',
                          background: 'var(--bg2)',
                        }}>⊞</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{fmtDt(tr['Entry DateTime'])}</td>
                      <td><span className={`badge ${tr['Trade Type'] === 'Long' ? 'badge-green' : 'badge-red'}`}>
                        {tr['Trade Type'] === 'Long' ? 'L' : 'S'}
                      </span></td>
                      <td className={tr['Net PnL'] >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 500 }}>
                        {tr['Net PnL'] >= 0 ? '+' : ''}${tr['Net PnL'].toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--green)', fontSize: 10 }}>+${tr['Max Open Profit (C)'].toFixed(1)}</td>
                      <td style={{ color: 'var(--red)', fontSize: 10 }}>${tr['Max Open Loss (C)'].toFixed(1)}</td>
                      <td><span className={`badge ${tr.market['2kWave'] === 'Green' ? 'badge-green' : 'badge-red'}`}>{tr.market['2kWave']}</span></td>
                      <td style={{ color: tr.market['Delta%'] >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'monospace', fontSize: 10 }}>
                        {(tr.market['Delta%'] * 100).toFixed(1)}%
                      </td>
                      <td style={{ color: 'var(--green)', fontFamily: 'monospace', fontSize: 10 }}>{tr.market.BullishDSS}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
