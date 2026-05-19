'use client'
import { useState, useEffect } from 'react'
import type { Trade } from '@/types'
import { fmtDt, fmtDuration } from '@/lib/parser'

function useTradeNote(tradeId: string) {
  const key = `wme-note-${tradeId}`
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNote(localStorage.getItem(key) ?? '')
  }, [key])

  const save = (val: string) => {
    setNote(val)
    localStorage.setItem(key, val)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return { note, save, saved }
}

interface Props {
  trade: Trade
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase',
        letterSpacing: '.6px', fontWeight: 600, marginBottom: 8,
        paddingBottom: 4, borderBottom: '1px solid var(--border)',
      }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--t2)' }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 500, color: color ?? 'var(--t1)' }}>
        {value}
      </span>
    </div>
  )
}

function WavePill({ wave, state }: { wave: string; state: string }) {
  const green = state === 'Green'
  return (
    <div style={{
      borderRadius: 6, padding: '6px 8px', textAlign: 'center',
      background: green ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${green ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
    }}>
      <div style={{ fontSize: 8, color: 'var(--t3)', marginBottom: 2 }}>{wave}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: green ? 'var(--green)' : 'var(--red)' }}>{state}</div>
    </div>
  )
}

export default function TradeModal({ trade: t, onClose }: Props) {
  const win = t['Net PnL'] > 0
  const { note, save, saved } = useTradeNote(t.id)

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.6)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 70,
        width: 720, maxHeight: '88vh',
        background: 'var(--bg1)',
        border: '1px solid var(--border2)',
        borderRadius: 12,
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0,
          background: 'var(--bg1)', zIndex: 1,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: win ? 'var(--green)' : 'var(--red)',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{t.Note}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
              {fmtDt(t['Entry DateTime'])} → {fmtDt(t['Exit DateTime'])} · {fmtDuration(t.Duration)}
            </div>
          </div>
          <div style={{
            fontSize: 20, fontWeight: 600,
            color: win ? 'var(--green)' : 'var(--red)',
            marginRight: 8,
          }}>
            {t['Net PnL'] >= 0 ? '+' : ''}${t['Net PnL'].toFixed(2)}
          </div>
          <button onClick={onClose} style={{
            fontSize: 18, padding: '2px 8px', borderRadius: 6,
            border: '1px solid var(--border)', background: 'var(--bg3)',
            color: 'var(--t2)', cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Body — 2 columns */}
        <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* LEFT */}
          <div>
            <Section title="Trade execution">
              <Row label="Symbol"       value={t.Symbol} />
              <Row label="Type"         value={t['Trade Type']}
                color={t['Trade Type'] === 'Long' ? 'var(--green)' : 'var(--red)'} />
              <Row label="Quantity"     value={t['Trade Quantity']} />
              <Row label="Entry price"  value={t['Entry Price'].toFixed(2)} />
              <Row label="Exit price"   value={t['Exit Price'].toFixed(2)} />
              <Row label="Duration"     value={fmtDuration(t.Duration)} />
            </Section>

            <Section title="PnL breakdown">
              <Row label="Gross P/L"    value={`${t['Profit/Loss (C)'] >= 0 ? '+' : ''}$${t['Profit/Loss (C)'].toFixed(2)}`}
                color={t['Profit/Loss (C)'] >= 0 ? 'var(--green)' : 'var(--red)'} />
              <Row label="Commission"   value={`$${t['Commission (C)'].toFixed(2)}`} color="var(--red)" />
              <Row label="Net PnL"      value={`${t['Net PnL'] >= 0 ? '+' : ''}$${t['Net PnL'].toFixed(2)}`}
                color={win ? 'var(--green)' : 'var(--red)'} />
              <Row label="MFE (runup)"  value={`+$${t['Max Open Profit (C)'].toFixed(2)}`} color="var(--green)" />
              <Row label="MAE (dd)"     value={`$${t['Max Open Loss (C)'].toFixed(2)}`}    color="var(--red)" />
            </Section>

            <Section title="Entry vs bands">
              {[
                ['VWAP', t['Entry >VWAP']],
                ['TB1',  t['Entry >TB1']],
                ['TB2',  t['Entry >TB2']],
                ['TB3',  t['Entry >TB3']],
                ['BB1',  t['Entry <BB1']],
                ['BB2',  t['Entry <BB2']],
                ['BB3',  t['Entry <BB3']],
              ].map(([k, v]) => {
                const above = String(v).startsWith('Above')
                return (
                  <Row key={String(k)} label={String(k)} value={String(v)}
                    color={above ? 'var(--green)' : 'var(--red)'} />
                )
              })}
            </Section>
          </div>

          {/* RIGHT */}
          <div>
            <Section title="Wave alignment">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
                {(['2kWave','2mWave','30mWave','30sWave'] as const).map(w => (
                  <WavePill key={w} wave={w} state={t.market[w]} />
                ))}
              </div>
            </Section>

            <Section title="Volume pressure">
              <Row label="wASK"         value={t.market.wASK} color="var(--green)" />
              <Row label="wBID"         value={t.market.wBID} color="var(--red)" />
              <Row label="DWask"        value={t.market.DWask.toFixed(4)} />
              <Row label="DWbid"        value={t.market.DWbid.toFixed(4)} />
              <Row label="Raw ASK−BID"  value={`${t.market['RawASK-BID'] >= 0 ? '+' : ''}${t.market['RawASK-BID']}`}
                color={t.market['RawASK-BID'] >= 0 ? 'var(--green)' : 'var(--red)'} />
              <Row label="Delta%"       value={`${(t.market['Delta%'] * 100).toFixed(2)}%`}
                color={t.market['Delta%'] >= 0 ? 'var(--green)' : 'var(--red)'} />
              <Row label="ASK%"         value={`${(t.market['ASK%'] * 100).toFixed(1)}%`} color="var(--green)" />
              <Row label="BID%"         value={`${(t.market['BID%'] * 100).toFixed(1)}%`} color="var(--red)" />
              {/* BID/ASK bar */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginBottom: 3 }}>
                  <span>BID {(t.market['BID%'] * 100).toFixed(1)}%</span>
                  <span>ASK {(t.market['ASK%'] * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${t.market['BID%'] * 100}%`, background: 'var(--red)' }} />
                  <div style={{ width: `${t.market['ASK%'] * 100}%`, background: 'var(--green)' }} />
                </div>
              </div>
            </Section>

            <Section title="EMA distances">
              <Row label="E8 vs 2kWCL" value={`${t.market.E8_2kCL >= 0 ? '+' : ''}${t.market.E8_2kCL.toFixed(2)}`}
                color={t.market.E8_2kCL >= 0 ? 'var(--green)' : 'var(--red)'} />
              <Row label="E8 vs 2mCL"  value={`${t.market.E8_2mCL >= 0 ? '+' : ''}${t.market.E8_2mCL.toFixed(2)}`}
                color={t.market.E8_2mCL >= 0 ? 'var(--green)' : 'var(--red)'} />
            </Section>

            <Section title="DSS momentum">
              <Row label="BullishDSS" value={t.market.BullishDSS} color="var(--green)" />
              <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${t.market.BullishDSS}%`, background: 'var(--green)', borderRadius: 2 }} />
              </div>
              <Row label="BearishDSS" value={t.market.BearishDSS} color="var(--red)" />
              <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${t.market.BearishDSS}%`, background: 'var(--red)', borderRadius: 2 }} />
              </div>
            </Section>

            <Section title="Volume flags">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {[
                  { k: 'ASK>1050', v: t.market['ASK>1050'], bull: true },
                  { k: 'BID<950',  v: t.market['BID<950'],  bull: true },
                  { k: 'BID>1050', v: t.market['BID>1050'], bull: false },
                  { k: 'ASK<950',  v: t.market['ASK<950'],  bull: false },
                ].map(f => (
                  <div key={f.k} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg2)', borderRadius: 5, padding: '4px 8px',
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--t2)' }}>{f.k}</span>
                    <span className={`badge ${f.v ? (f.bull ? 'badge-green' : 'badge-red') : 'badge-gray'}`}>
                      {f.v ? 'Yes' : 'No'}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Notes">
              <textarea
                value={note}
                onChange={e => save(e.target.value)}
                placeholder="Add notes about this trade — what you saw, what you did well, what to improve..."
                style={{
                  width: '100%', minHeight: 90,
                  background: 'var(--bg2)',
                  border: '1px solid var(--border2)',
                  borderRadius: 7,
                  padding: '8px 10px',
                  fontSize: 11,
                  color: 'var(--t1)',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
              />
              {saved && (
                <div style={{ fontSize: 9, color: 'var(--green)', marginTop: 4, textAlign: 'right' }}>
                  Saved
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </>
  )
}
