'use client'
import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import type { FilterState, WaveFilter, VwapFilter } from '@/types/filters'
import { PREDEFINED_TAGS, TAG_COLOR } from '@/types/filters'
import { Slider } from '@/components/ui/slider'

function GroupLabel({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase',
      letterSpacing: '.6px', fontWeight: 600,
      padding: '12px 14px 6px',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ background: 'var(--bg4)', color: 'var(--blue)', borderRadius: 4, padding: '1px 5px', fontSize: 9 }}>{num}</span>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '4px 14px' }}>{children}</div>
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 5 }}>{children}</div>
}

function Toggle3<T extends string>({ options, value, onChange, colors }: {
  options: T[]; value: T; onChange: (v: T) => void
  colors?: Record<string, string>
}) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {options.map(o => {
        const accent = colors?.[o] ?? 'var(--blue)'
        const active = value === o
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            flex: 1, padding: '4px 0', fontSize: 10, borderRadius: 5,
            border: '1px solid',
            borderColor: active ? accent : 'var(--border)',
            background: active ? `${accent}22` : 'var(--bg3)',
            color: active ? accent : 'var(--t3)',
            cursor: 'pointer', transition: 'all .1s',
          }}>{o}</button>
        )
      })}
    </div>
  )
}

function WaveToggle({ label, value, onChange }: {
  label: string; value: WaveFilter; onChange: (v: WaveFilter) => void
}) {
  return (
    <Row>
      <RowLabel>{label}</RowLabel>
      <Toggle3
        options={['Both','Green','Red'] as WaveFilter[]}
        value={value} onChange={onChange}
        colors={{ Green: 'var(--green)', Red: 'var(--red)', Both: 'var(--blue)' }}
      />
    </Row>
  )
}

function BandToggle({ label, value, onChange }: {
  label: string; value: VwapFilter; onChange: (v: VwapFilter) => void
}) {
  return (
    <Row>
      <RowLabel>{label}</RowLabel>
      <Toggle3
        options={['Both','Above','Below'] as VwapFilter[]}
        value={value} onChange={onChange}
        colors={{ Above: 'var(--green)', Below: 'var(--red)', Both: 'var(--blue)' }}
      />
    </Row>
  )
}

function RangeSlider({ label, min, max, valMin, valMax, step = 1, fmt, onChange }: {
  label: string; min: number; max: number
  valMin: number; valMax: number; step?: number
  fmt: (v: number) => string
  onChange: (min: number, max: number) => void
}) {
  const isDefault = valMin === min && valMax === max

  return (
    <Row>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <RowLabel>{label}</RowLabel>
        <span style={{ fontSize: 10, color: isDefault ? 'var(--t3)' : 'var(--blue)', fontFamily: 'monospace', fontWeight: 500 }}>
          {isDefault ? 'all' : `${fmt(valMin)} → ${fmt(valMax)}`}
        </span>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[valMin, valMax]}
        onValueChange={([lo, hi]) => onChange(lo, hi)}
        active={!isDefault}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginTop: 6 }}>
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
    </Row>
  )
}

function ImbalanceSlider({ label, value, min, max, step = 50, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void
}) {
  const absMax  = Math.max(Math.abs(min), Math.abs(max))
  const sliderMin = -absMax
  const sliderMax =  absMax
  const pct = ((value - sliderMin) / (sliderMax - sliderMin)) * 100
  const isCenter = value === 0
  const isAsk = value < 0
  const isBid = value > 0

  return (
    <Row>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <RowLabel>{label}</RowLabel>
        {!isCenter && (
          <button onClick={() => onChange(0)} style={{
            fontSize: 9, color: 'var(--t3)', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0,
          }}>reset</button>
        )}
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 4 }}>
        <span style={{ color: isAsk ? 'var(--green)' : 'var(--t3)', fontWeight: isAsk ? 600 : 400 }}>← ASK dominant</span>
        <span style={{ color: isCenter ? 'var(--t3)' : 'transparent' }}>balanced</span>
        <span style={{ color: isBid ? 'var(--red)' : 'var(--t3)', fontWeight: isBid ? 600 : 400 }}>BID dominant →</span>
      </div>
      {/* Track */}
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 5, background: 'var(--bg3)', borderRadius: 3 }} />
        {!isCenter && (
          <div style={{
            position: 'absolute',
            left: isAsk ? `${pct}%` : '50%',
            right: isBid ? `${100 - pct}%` : '50%',
            height: 5,
            background: isAsk ? 'var(--green)' : 'var(--red)',
            borderRadius: 3,
          }} />
        )}
        {/* Center tick */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 2, height: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 1 }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute', left: `calc(${pct}% - 8px)`,
          width: 16, height: 16, borderRadius: '50%',
          background: isCenter ? 'var(--bg4)' : isAsk ? 'var(--green)' : 'var(--red)',
          border: `2px solid ${isCenter ? 'var(--border2)' : isAsk ? 'var(--green)' : 'var(--red)'}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          pointerEvents: 'none', transition: 'background .15s',
        }} />
        <input type="range" min={sliderMin} max={sliderMax} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 20, margin: 0 }} />
      </div>
      <div style={{ fontSize: 10, textAlign: 'center', fontFamily: 'monospace', color: isCenter ? 'var(--t3)' : isAsk ? 'var(--green)' : 'var(--red)' }}>
        {isCenter ? 'No filter — all trades' : isAsk
          ? `ASK dominant ≥ ${Math.abs(value)}`
          : `BID dominant ≥ ${Math.abs(value)}`}
      </div>
    </Row>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function FilterPanel() {
  const {
    trades, filterOpen, setFilterOpen,
    scope, setScope,
    globalFilters, setGlobalFilters,
    localFilters, setLocalFilters,
    resetGlobalFilters, resetLocalFilters,
    activeFilterCount, filteredTrades, ranges,
    tagIndex,
  } = useStore()

  const filters    = scope === 'global' ? globalFilters : localFilters
  const setFilters = scope === 'global' ? setGlobalFilters : setLocalFilters
  const reset      = scope === 'global' ? resetGlobalFilters : resetLocalFilters

  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    setFilters({ ...filters, [key]: val })

  const allSetups = useMemo(() =>
    Array.from(new Set(trades.map(t => t.Setup))).sort(), [trades])

  const allBuckets = useMemo(() =>
    Array.from(new Set(trades.map(t => t.market['Time Bucket']))).sort(), [trades])

  const toggleSetup  = (s: string) => set('setups', filters.setups.includes(s) ? filters.setups.filter(x => x !== s) : [...filters.setups, s])
  const toggleBucket = (b: string) => set('timeBuckets', filters.timeBuckets.includes(b) ? filters.timeBuckets.filter(x => x !== b) : [...filters.timeBuckets, b])
  const toggleTag    = (tag: string) => set('activeTags', filters.activeTags.includes(tag) ? filters.activeTags.filter(x => x !== tag) : [...filters.activeTags, tag])

  return (
    <AnimatePresence>
      {filterOpen && (<>
      <motion.div
        key="fp-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => setFilterOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.45)' }}
      />

      <motion.div
        key="fp-panel"
        initial={{ x: 310 }}
        animate={{ x: 0 }}
        exit={{ x: 310 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 300, zIndex: 50,
          background: 'var(--bg1)', borderLeft: '1px solid var(--border2)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}
      >

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg1)', zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Filters</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>
              {filteredTrades.length} / {trades.length} trades match
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {activeFilterCount > 0 && (
              <button onClick={reset} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: 'var(--red)', cursor: 'pointer' }}>
                Reset all
              </button>
            )}
            <button onClick={() => setFilterOpen(false)} style={{ fontSize: 14, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--t2)', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Scope */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Filter scope</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['global','local'] as const).map(s => (
              <button key={s} onClick={() => setScope(s)} style={{
                flex: 1, padding: '5px 0', fontSize: 11, borderRadius: 6,
                border: '1px solid', borderColor: scope === s ? 'var(--blue)' : 'var(--border)',
                background: scope === s ? 'rgba(59,130,246,0.15)' : 'var(--bg2)',
                color: scope === s ? 'var(--blue)' : 'var(--t3)',
                cursor: 'pointer', fontWeight: scope === s ? 500 : 400,
              }}>{s === 'global' ? '🌐 Global' : '📄 This page'}</button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 5, lineHeight: 1.4 }}>
            {scope === 'global' ? 'Applies across all pages.' : 'This page only. Resets on navigation.'}
          </div>
        </div>

        {/* ① Setup */}
        <GroupLabel num="①">Setup</GroupLabel>
        <Row>
          <RowLabel>Setup type</RowLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {allSetups.map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.setups.includes(s)} onChange={() => toggleSetup(s)}
                  style={{ accentColor: 'var(--blue)', width: 13, height: 13, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: filters.setups.includes(s) ? 'var(--t1)' : 'var(--t2)', flex: 1 }}>{s}</span>
                <span style={{ fontSize: 9, color: 'var(--t3)' }}>{trades.filter(t => t.Setup === s).length}T</span>
              </label>
            ))}
          </div>
        </Row>
        <Row>
          <RowLabel>Trade type</RowLabel>
          <Toggle3 options={['All','Long','Short']} value={filters.tradeType}
            onChange={v => set('tradeType', v as FilterState['tradeType'])}
            colors={{ Long: 'var(--green)', Short: 'var(--red)', All: 'var(--blue)' }} />
        </Row>
        <Row>
          <RowLabel>Date range</RowLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 5, padding: '4px 8px', fontSize: 11, color: 'var(--t1)', width: '100%', outline: 'none' }} />
            <input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 5, padding: '4px 8px', fontSize: 11, color: 'var(--t1)', width: '100%', outline: 'none' }} />
          </div>
        </Row>

        {/* ② Market structure */}
        <GroupLabel num="②">Market structure</GroupLabel>
        <div style={{ padding: '4px 14px 2px', fontSize: 9, color: 'var(--t3)', letterSpacing: '.3px' }}>WAVE STATES</div>
        <WaveToggle label="2kWave"  value={filters.wave2k}  onChange={v => set('wave2k', v)} />
        <WaveToggle label="2mWave"  value={filters.wave2m}  onChange={v => set('wave2m', v)} />
        <WaveToggle label="30mWave" value={filters.wave30m} onChange={v => set('wave30m', v)} />
        <WaveToggle label="30sWave" value={filters.wave30s} onChange={v => set('wave30s', v)} />
        <div style={{ padding: '10px 14px 2px', fontSize: 9, color: 'var(--t3)', letterSpacing: '.3px' }}>ENTRY PRICE vs BANDS</div>
        <BandToggle label="vs VWAP" value={filters.entryVwap} onChange={v => set('entryVwap', v)} />
        <BandToggle label="vs TB1"  value={filters.entryTB1}  onChange={v => set('entryTB1', v)} />
        <BandToggle label="vs TB2"  value={filters.entryTB2}  onChange={v => set('entryTB2', v)} />
        <BandToggle label="vs TB3"  value={filters.entryTB3}  onChange={v => set('entryTB3', v)} />
        <BandToggle label="vs BB1"  value={filters.entryBB1}  onChange={v => set('entryBB1', v)} />
        <BandToggle label="vs BB2"  value={filters.entryBB2}  onChange={v => set('entryBB2', v)} />
        <BandToggle label="vs BB3"  value={filters.entryBB3}  onChange={v => set('entryBB3', v)} />

        {/* ③ Volume pressure */}
        <GroupLabel num="③">Volume &amp; pressure</GroupLabel>
        <div style={{ padding: '4px 0 4px' }}>
          <ImbalanceSlider
            label="Volume imbalance (Raw ASK−BID)"
            value={filters.rawImbalance}
            min={ranges.rawMin} max={ranges.rawMax}
            step={50}
            onChange={v => set('rawImbalance', v)}
          />
        </div>
        <div style={{ padding: '0 0 8px' }}>
          <ImbalanceSlider
            label="Delta Wave (Net DW Skew)"
            value={filters.dwSkew}
            min={ranges.dwMin} max={ranges.dwMax}
            step={1}
            onChange={v => set('dwSkew', v)}
          />
        </div>

        {/* ④ Numeric ranges */}
        <GroupLabel num="④">Numeric ranges</GroupLabel>
        <RangeSlider label="Delta%" min={ranges.deltaMin} max={ranges.deltaMax} step={0.01}
          valMin={filters.deltaMin} valMax={filters.deltaMax}
          fmt={v => `${(v * 100).toFixed(0)}%`}
          onChange={(mn,mx) => setFilters({ ...filters, deltaMin: mn, deltaMax: mx })} />
        <RangeSlider label="E8 vs 2kWCL (ticks)" min={ranges.e8kMin} max={ranges.e8kMax} step={1}
          valMin={filters.e8kMin} valMax={filters.e8kMax}
          fmt={v => `${v > 0 ? '+' : ''}${v}`}
          onChange={(mn,mx) => setFilters({ ...filters, e8kMin: mn, e8kMax: mx })} />
        <RangeSlider label="E8 vs 2mCL (ticks)" min={ranges.e8mMin} max={ranges.e8mMax} step={1}
          valMin={filters.e8mMin} valMax={filters.e8mMax}
          fmt={v => `${v > 0 ? '+' : ''}${v}`}
          onChange={(mn,mx) => setFilters({ ...filters, e8mMin: mn, e8mMax: mx })} />
        <RangeSlider label="2kWCL vs 2mWCL (ticks)" min={ranges.wcl2k2mMin} max={ranges.wcl2k2mMax} step={1}
          valMin={filters.wcl2k2mMin} valMax={filters.wcl2k2mMax}
          fmt={v => `${v > 0 ? '+' : ''}${v}`}
          onChange={(mn,mx) => setFilters({ ...filters, wcl2k2mMin: mn, wcl2k2mMax: mx })} />
        <RangeSlider label="BullishDSS" min={ranges.bullMin} max={ranges.bullMax} step={1}
          valMin={filters.bullDSSMin} valMax={filters.bullDSSMax}
          fmt={v => String(v)}
          onChange={(mn,mx) => setFilters({ ...filters, bullDSSMin: mn, bullDSSMax: mx })} />
        <RangeSlider label="BearishDSS" min={ranges.bearMin} max={ranges.bearMax} step={1}
          valMin={filters.bearDSSMin} valMax={filters.bearDSSMax}
          fmt={v => String(v)}
          onChange={(mn,mx) => setFilters({ ...filters, bearDSSMin: mn, bearDSSMax: mx })} />

        {/* ⑤ Time */}
        <GroupLabel num="⑤">Time of day</GroupLabel>
        <Row>
          <RowLabel>Time bucket <span style={{ color: 'var(--t3)' }}>(empty = all)</span></RowLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allBuckets.map(b => {
              const active = filters.timeBuckets.includes(b)
              const count = trades.filter(t => t.market['Time Bucket'] === b).length
              return (
                <button key={b} onClick={() => toggleBucket(b)} style={{
                  padding: '3px 8px', fontSize: 10, borderRadius: 4,
                  border: '1px solid', borderColor: active ? 'var(--blue)' : 'var(--border)',
                  background: active ? 'rgba(59,130,246,0.15)' : 'var(--bg3)',
                  color: active ? 'var(--blue)' : 'var(--t3)', cursor: 'pointer',
                }}>
                  {b} <span style={{ fontSize: 8, opacity: 0.6 }}>({count})</span>
                </button>
              )
            })}
          </div>
        </Row>

        {/* ⑥ Behavioral tags */}
        <GroupLabel num="⑥">Tags</GroupLabel>
        <Row>
          <RowLabel>Behavioral <span style={{ color: 'var(--t3)' }}>(empty = all)</span></RowLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {PREDEFINED_TAGS.map(tag => {
              const active     = filters.activeTags.includes(tag)
              const color      = TAG_COLOR[tag]
              const count      = Object.values(tagIndex).filter(ts => ts.includes(tag)).length
              const isPositive = tag === 'Plan Followed'
              const isNeutral  = tag === 'Early Exit'
              const activeBg   = isPositive ? 'rgba(34,197,94,0.15)' : isNeutral ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: '4px 9px', fontSize: 10, borderRadius: 5,
                  border: '1px solid',
                  borderColor: active ? color : 'var(--border)',
                  background: active ? activeBg : 'var(--bg3)',
                  color: active ? color : 'var(--t3)',
                  cursor: 'pointer', transition: 'all .1s',
                  fontWeight: active ? 500 : 400,
                }}>
                  {tag}{count > 0 && <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 4 }}>({count})</span>}
                </button>
              )
            })}
          </div>
        </Row>
        {(() => {
          const predefinedSet = new Set<string>(PREDEFINED_TAGS)
          const customInUse = Array.from(new Set(
            Object.values(tagIndex).flat().filter(t => !predefinedSet.has(t))
          )).sort()
          if (customInUse.length === 0) return null
          return (
            <Row>
              <RowLabel>Custom</RowLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {customInUse.map(tag => {
                  const active = filters.activeTags.includes(tag)
                  const count  = Object.values(tagIndex).filter(ts => ts.includes(tag)).length
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)} style={{
                      padding: '4px 9px', fontSize: 10, borderRadius: 5,
                      border: '1px solid',
                      borderColor: active ? 'var(--blue)' : 'var(--border)',
                      background: active ? 'rgba(59,130,246,0.15)' : 'var(--bg3)',
                      color: active ? 'var(--blue)' : 'var(--t3)',
                      cursor: 'pointer', transition: 'all .1s',
                      fontWeight: active ? 500 : 400,
                    }}>
                      {tag}{count > 0 && <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 4 }}>({count})</span>}
                    </button>
                  )
                })}
              </div>
            </Row>
          )
        })()}

        {/* Active summary */}
        {activeFilterCount > 0 && (
          <div style={{ margin: '12px 14px 14px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 7, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 500, marginBottom: 2 }}>
              {activeFilterCount} filter group{activeFilterCount > 1 ? 's' : ''} active
            </div>
            <div style={{ fontSize: 9, color: 'var(--t3)' }}>
              {filteredTrades.length} of {trades.length} trades · all charts updated
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </motion.div>
      </>)}
    </AnimatePresence>
  )
}
