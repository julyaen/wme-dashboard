'use client'
import React, { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { fmtDt, fmtDuration } from '@/lib/parser'
import type { Trade } from '@/types'
import Link from 'next/link'
import TradeModal from '@/components/TradeModal'
import { useScreenshotIndex } from '@/lib/useScreenshot'
import { TAG_COLOR } from '@/types/filters'

type SortKey = keyof Trade | 'none'
const PAGE_SIZE = 50

export default function JournalPage() {
  const { filteredTrades: trades, trades: allTrades, tagIndex } = useStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'All'|'Long'|'Short'>('All')
  const [setupFilter, setSetupFilter] = useState('All')
  const [outcomeFilter, setOutcomeFilter] = useState<'All'|'Win'|'Loss'>('All')
  const [sortKey, setSortKey] = useState<SortKey>('Entry DateTime')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [modalTrade, setModalTrade] = useState<Trade | null>(null)

  const { index: screenshotIndex } = useScreenshotIndex()
  const setups = useMemo(() => ['All', ...Array.from(new Set(allTrades.map(t => t.Setup))).sort()], [allTrades])

  const filtered = useMemo(() => {
    setPage(1) // reset to page 1 on filter change
    return trades
      .filter(t => {
        if (typeFilter !== 'All' && t['Trade Type'] !== typeFilter) return false
        if (setupFilter !== 'All' && t.Setup !== setupFilter) return false
        if (outcomeFilter === 'Win' && t['Net PnL'] <= 0) return false
        if (outcomeFilter === 'Loss' && t['Net PnL'] >= 0) return false
        if (search) {
          const q = search.toLowerCase()
          if (!t.Note.toLowerCase().includes(q) && !t.Setup.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const av = a[sortKey as keyof Trade]
        const bv = b[sortKey as keyof Trade]
        if (av === undefined || bv === undefined) return 0
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [trades, search, typeFilter, setupFilter, outcomeFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const thStyle = (key: SortKey) => ({
    cursor: 'pointer',
    userSelect: 'none' as const,
    color: sortKey === key ? 'var(--blue)' : 'var(--t3)',
  })

  const wins  = filtered.filter(t => t['Net PnL'] > 0).length
  const netPnL = filtered.reduce((a, t) => a + t['Net PnL'], 0)

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

      {/* Modal */}
      {modalTrade && <TradeModal trade={modalTrade} onClose={() => setModalTrade(null)} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search setup..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 7, padding: '6px 12px', fontSize: 12,
            color: 'var(--t1)', width: 200, outline: 'none',
          }}
        />
        {(['All','Long','Short'] as const).map(v => (
          <button key={v} onClick={() => setTypeFilter(v)}
            className={`btn ${typeFilter === v ? 'btn-primary' : ''}`}
            style={{ padding: '5px 12px', fontSize: 11 }}>{v}</button>
        ))}
        <select value={setupFilter} onChange={e => setSetupFilter(e.target.value)}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: 'var(--t1)', outline: 'none' }}>
          {setups.map(s => <option key={s}>{s}</option>)}
        </select>
        {(['All','Win','Loss'] as const).map(v => (
          <button key={v} onClick={() => setOutcomeFilter(v)}
            className={`btn ${outcomeFilter === v ? 'btn-primary' : ''}`}
            style={{ padding: '5px 12px', fontSize: 11 }}>{v}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 11, color: 'var(--t3)' }}>
          <span>{filtered.length} trades</span>
          <span className={wins / filtered.length >= 0.5 ? 'pos' : 'neg'}>
            {filtered.length ? (wins / filtered.length * 100).toFixed(1) : 0}% WR
          </span>
          <span className={netPnL >= 0 ? 'pos' : 'neg'}>${netPnL.toFixed(2)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '68vh' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th style={{ width: 28, textAlign: 'center', color: 'var(--t3)' }}>📷</th>
                <th style={thStyle('Note')} onClick={() => toggleSort('Note')}>Setup {sortKey === 'Note' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={thStyle('Trade Type')} onClick={() => toggleSort('Trade Type')}>Type</th>
                <th style={thStyle('Entry DateTime')} onClick={() => toggleSort('Entry DateTime')}>Entry {sortKey === 'Entry DateTime' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={thStyle('Exit DateTime')} onClick={() => toggleSort('Exit DateTime')}>Exit</th>
                <th style={thStyle('Duration')} onClick={() => toggleSort('Duration')}>Dur</th>
                <th style={thStyle('Entry Price')} onClick={() => toggleSort('Entry Price')}>Ep</th>
                <th style={thStyle('Exit Price')} onClick={() => toggleSort('Exit Price')}>Xp</th>
                <th style={thStyle('Profit/Loss (C)')} onClick={() => toggleSort('Profit/Loss (C)')}>P/L {sortKey === 'Profit/Loss (C)' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={thStyle('Net PnL')} onClick={() => toggleSort('Net PnL')}>Net PnL {sortKey === 'Net PnL' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={thStyle('Max Open Profit (C)')} onClick={() => toggleSort('Max Open Profit (C)')}>MFE</th>
                <th style={thStyle('Max Open Loss (C)')} onClick={() => toggleSort('Max Open Loss (C)')}>MAE</th>
                <th>Comm</th>
                <th>2kW</th>
                <th>2mW</th>
                <th>E8_2k</th>
                <th>Delta%</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(tr => (
                <React.Fragment key={tr.id}>
                  <tr onClick={() => setExpanded(expanded === tr.id ? null : tr.id)}
                    style={{ cursor: 'pointer' }}>
                    {/* Detail button */}
                    <td onClick={e => { e.stopPropagation(); setModalTrade(tr) }}
                      style={{ textAlign: 'center', padding: '4px 6px' }}>
                      <span style={{
                        fontSize: 10, color: 'var(--t3)', cursor: 'pointer',
                        padding: '1px 5px', borderRadius: 3,
                        border: '1px solid var(--border)',
                        background: 'var(--bg2)',
                      }} title="Open detail view">⊞</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                      {screenshotIndex[tr.id] && (
                        <span style={{ fontSize: 12, color: 'var(--blue)' }} title="Has screenshot">📷</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--t1)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.Note}</td>
                    <td><span className={`badge ${tr['Trade Type'] === 'Long' ? 'badge-green' : 'badge-red'}`}>{tr['Trade Type'] === 'Long' ? 'Long' : 'Short'}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{fmtDt(tr['Entry DateTime'])}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{fmtDt(tr['Exit DateTime'])}</td>
                    <td style={{ color: 'var(--t3)' }}>{fmtDuration(tr.Duration)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{tr['Entry Price'].toFixed(2)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{tr['Exit Price'].toFixed(2)}</td>
                    <td className={tr['Profit/Loss (C)'] >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 500 }}>
                      {tr['Profit/Loss (C)'] >= 0 ? '+' : ''}${tr['Profit/Loss (C)'].toFixed(0)}
                    </td>
                    <td className={tr['Net PnL'] >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 500 }}>
                      {tr['Net PnL'] >= 0 ? '+' : ''}${tr['Net PnL'].toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--green)', fontSize: 10 }}>+${tr['Max Open Profit (C)'].toFixed(1)}</td>
                    <td style={{ color: 'var(--red)', fontSize: 10 }}>${tr['Max Open Loss (C)'].toFixed(1)}</td>
                    <td style={{ color: 'var(--t3)' }}>{tr['Commission (C)'].toFixed(2)}</td>
                    <td><span className={`badge ${tr.market['2kWave'] === 'Green' ? 'badge-green' : 'badge-red'}`}>{tr.market['2kWave']}</span></td>
                    <td><span className={`badge ${tr.market['2mWave'] === 'Green' ? 'badge-green' : 'badge-red'}`}>{tr.market['2mWave']}</span></td>
                    <td style={{ color: tr.market.E8_2kCL >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'monospace', fontSize: 10 }}>
                      {tr.market.E8_2kCL >= 0 ? '+' : ''}{tr.market.E8_2kCL.toFixed(1)}
                    </td>
                    <td style={{ color: tr.market['Delta%'] >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'monospace', fontSize: 10 }}>
                      {(tr.market['Delta%'] * 100).toFixed(1)}%
                    </td>
                  </tr>
                  {expanded === tr.id && (
                    <tr>
                      <td colSpan={18} style={{ background: 'var(--bg2)', padding: '10px 14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, fontSize: 11 }}>
                          <div><div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 4 }}>WAVE STATES</div>
                            {(['2kWave','2mWave','30mWave','30sWave'] as const).map(w => (
                              <div key={w} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: 'var(--t3)' }}>{w}</span>
                                <span style={{ color: tr.market[w] === 'Green' ? 'var(--green)' : 'var(--red)' }}>{tr.market[w]}</span>
                              </div>
                            ))}
                          </div>
                          <div><div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 4 }}>VOLUME FLAGS</div>
                            {[['ASK>1050', tr.market['ASK>1050']], ['BID<950', tr.market['BID<950']], ['BID>1050', tr.market['BID>1050']], ['ASK<950', tr.market['ASK<950']]].map(([k,v]) => (
                              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: 'var(--t3)' }}>{k}</span>
                                <span style={{ color: v ? 'var(--green)' : 'var(--t3)' }}>{v ? 'Yes' : 'No'}</span>
                              </div>
                            ))}
                          </div>
                          <div><div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 4 }}>DSS</div>
                            <div style={{ marginBottom: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--t3)' }}>BullishDSS</span><span className="pos">{tr.market.BullishDSS}</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: 'var(--t3)' }}>BearishDSS</span><span className="neg">{tr.market.BearishDSS}</span></div>
                            </div>
                          </div>
                          <div><div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 4 }}>EMA DISTANCES</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <span style={{ color: 'var(--t3)' }}>E8 vs 2kWCL</span>
                              <span style={{ color: tr.market.E8_2kCL >= 0 ? 'var(--green)' : 'var(--red)' }}>{tr.market.E8_2kCL.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--t3)' }}>E8 vs 2mCL</span>
                              <span style={{ color: tr.market.E8_2mCL >= 0 ? 'var(--green)' : 'var(--red)' }}>{tr.market.E8_2mCL.toFixed(2)}</span>
                            </div>
                          </div>
                          <div><div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 4 }}>BANDS</div>
                            {[['VWAP', tr['Entry >VWAP']], ['TB1', tr['Entry >TB1']], ['TB2', tr['Entry >TB2']]].map(([k,v]) => (
                              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: 'var(--t3)' }}>{k}</span>
                                <span style={{ color: String(v).startsWith('Above') ? 'var(--green)' : 'var(--red)', fontSize: 10 }}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {(tagIndex[tr.id] ?? []).length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Tags</span>
                            {(tagIndex[tr.id] ?? []).map(tag => (
                              <span key={tag} style={{
                                fontSize: 9, padding: '2px 7px', borderRadius: 4,
                                border: `1px solid ${TAG_COLOR[tag] ?? 'var(--border)'}`,
                                color: TAG_COLOR[tag] ?? 'var(--t2)',
                                background: 'var(--bg3)',
                              }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '10px 14px',
            borderTop: '1px solid var(--border)',
          }}>
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="btn" style={{ padding: '3px 8px', fontSize: 11, opacity: page === 1 ? 0.3 : 1 }}>«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn" style={{ padding: '3px 8px', fontSize: 11, opacity: page === 1 ? 0.3 : 1 }}>‹</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) => p === '…'
                ? <span key={`e${i}`} style={{ fontSize: 11, color: 'var(--t3)', padding: '0 4px' }}>…</span>
                : <button key={p} onClick={() => setPage(p as number)}
                    className="btn" style={{
                      padding: '3px 9px', fontSize: 11,
                      background: page === p ? 'var(--blue)' : 'transparent',
                      borderColor: page === p ? 'var(--blue)' : 'var(--border)',
                      color: page === p ? '#fff' : 'var(--t2)',
                    }}>{p}</button>
              )}

            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn" style={{ padding: '3px 8px', fontSize: 11, opacity: page === totalPages ? 0.3 : 1 }}>›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="btn" style={{ padding: '3px 8px', fontSize: 11, opacity: page === totalPages ? 0.3 : 1 }}>»</button>

            <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 8 }}>
              {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
