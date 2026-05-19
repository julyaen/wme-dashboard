'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import Link from 'next/link'

const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function isoToDate(iso: string) { return new Date(iso + 'T12:00:00') }

export default function CalendarPage() {
  const { stats, trades: allTrades } = useStore()

  const availableMonths = useMemo(() => {
    if (!stats) return []
    return stats.dailyPnL
      .map(d => d.date.slice(0,7))
      .filter((v,i,a) => a.indexOf(v) === i)
      .sort()
  }, [stats])

  const [month, setMonth] = useState(() => availableMonths[availableMonths.length - 1] ?? '')

  const calData = stats?.calendarData ?? {}

  // Build the month grid
  const grid = useMemo(() => {
    if (!month) return []
    const [y, m] = month.split('-').map(Number)
    const firstDay = new Date(y, m - 1, 1)
    const lastDay  = new Date(y, m, 0)
    // ISO week starts Monday: 0=Mon...6=Sun
    const startOffset = (firstDay.getDay() + 6) % 7
    const cells: (string | null)[] = Array(startOffset).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(`${month}-${String(d).padStart(2,'0')}`)
    }
    // Pad to complete week
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [month])

  // Month summary
  const monthSummary = useMemo(() => {
    if (!month) return null
    const days = Object.entries(calData)
      .filter(([d]) => d.startsWith(month))
    const net   = days.reduce((a,[,v]) => a + v.netPnL, 0)
    const trd   = days.reduce((a,[,v]) => a + v.trades, 0)
    const wins  = days.reduce((a,[,v]) => a + v.wins, 0)
    const greenDays = days.filter(([,v]) => v.netPnL > 0).length
    const redDays   = days.filter(([,v]) => v.netPnL < 0).length
    return { net, trd, wins, greenDays, redDays, days: days.length }
  }, [month, calData])

  if (!allTrades.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12 }}>No trades loaded</div>
        <Link href="/import" className="btn btn-primary">Import data</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }}
          onClick={() => {
            const i = availableMonths.indexOf(month)
            if (i > 0) setMonth(availableMonths[i - 1])
          }}>‹</button>

        <select value={month} onChange={e => setMonth(e.target.value)}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 7,
            padding: '5px 10px', fontSize: 12, color: 'var(--t1)', outline: 'none' }}>
          {availableMonths.map(m => {
            const [y, mo] = m.split('-').map(Number)
            return <option key={m} value={m}>{MONTHS[mo-1]} {y}</option>
          })}
        </select>

        <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }}
          onClick={() => {
            const i = availableMonths.indexOf(month)
            if (i < availableMonths.length - 1) setMonth(availableMonths[i + 1])
          }}>›</button>

        {/* Month summary */}
        {monthSummary && (
          <div style={{ marginLeft: 16, display: 'flex', gap: 20, fontSize: 11 }}>
            <span className={monthSummary.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 500 }}>
              {monthSummary.net >= 0 ? '+' : ''}${monthSummary.net.toFixed(2)}
            </span>
            <span style={{ color: 'var(--t3)' }}>{monthSummary.trd} trades</span>
            <span style={{ color: 'var(--green)' }}>{monthSummary.greenDays} green days</span>
            <span style={{ color: 'var(--red)' }}>{monthSummary.redDays} red days</span>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="card" style={{ padding: 14 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--t3)',
              textTransform: 'uppercase', letterSpacing: '.5px', padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {grid.map((dateStr, i) => {
            if (!dateStr) {
              return <div key={`empty-${i}`} style={{ minHeight: 72 }} />
            }

            const data = calData[dateStr]
            const day  = parseInt(dateStr.split('-')[2])
            const wr   = data ? (data.wins / data.trades * 100) : 0
            const isGreen = data && data.netPnL > 0
            const isRed   = data && data.netPnL < 0

            const bg     = !data ? 'var(--bg2)'
              : isGreen ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
            const border = !data ? 'var(--border)'
              : isGreen ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'

            return (
              <div key={dateStr} style={{
                background: bg, border: `1px solid ${border}`,
                borderRadius: 7, padding: '6px 8px', minHeight: 72,
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                {/* Day number */}
                <div style={{ fontSize: 11, fontWeight: 500,
                  color: data ? 'var(--t1)' : 'var(--t3)' }}>{day}</div>

                {data ? (
                  <>
                    {/* Net PnL */}
                    <div style={{
                      fontSize: 12, fontWeight: 600, marginTop: 2,
                      color: isGreen ? 'var(--green)' : 'var(--red)',
                    }}>
                      {data.netPnL >= 0 ? '+' : ''}${data.netPnL.toFixed(0)}
                    </div>
                    {/* Trades + WR */}
                    <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 'auto' }}>
                      {data.trades}T · {wr.toFixed(0)}%
                    </div>
                    {/* Mini bar */}
                    <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${wr}%`,
                        background: isGreen ? 'var(--green)' : 'var(--red)',
                        borderRadius: 1,
                      }} />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 4 }}>no trades</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--t3)', padding: '0 4px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(34,197,94,0.3)', display: 'inline-block' }} />
          Green day (net positive)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239,68,68,0.3)', display: 'inline-block' }} />
          Red day (net negative)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'inline-block' }} />
          No trades
        </span>
      </div>
    </div>
  )
}
