'use client'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

const GRID_COLOR = 'rgba(255,255,255,0.04)'
const TICK_COLOR = '#555c6e'

interface EquityCurveProps {
  data: { trade: number; cumPnL: number }[]
}
export function EquityCurve({ data }: EquityCurveProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="trade" tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `$${v}`} width={50} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
        <Tooltip
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          labelStyle={{ color: '#8b91a0' }}
          formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cum PnL']}
        />
        <Line type="monotone" dataKey="cumPnL" stroke="#3b82f6"
          strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface BarWRProps {
  data: { bucket: string; winRate: number; trades: number; netPnL: number }[]
  maxWR?: number
}
export function WinRateBar({ data, maxWR = 100 }: BarWRProps) {
  const color = (wr: number) =>
    wr >= 65 ? '#22c55e' : wr >= 45 ? '#f59e0b' : '#ef4444'

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="bucket" tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false} />
        <YAxis domain={[0, maxWR]} tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `${v}%`} width={34} />
        <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          formatter={(v: number, _: string, p) => [
            `${v}% WR · ${p.payload.trades}T · $${p.payload.netPnL.toFixed(0)}`,
            'Win Rate',
          ]}
        />
        <Bar dataKey="winRate" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={color(d.winRate)} fillOpacity={0.75} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

interface DailyBarProps {
  data: { date: string; netPnL: number }[]
}
export function DailyBar({ data }: DailyBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="date"
          tickFormatter={v => {
            const d = new Date(v + 'T12:00:00')
            return `${d.getMonth() + 1}/${d.getDate()}`
          }}
          tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `$${v}`} width={44} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
        <Tooltip
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          formatter={(v: number) => [`$${v.toFixed(2)}`, 'Net PnL']}
        />
        <Bar dataKey="netPnL" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.netPnL >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Drawdown Chart ────────────────────────────────────────────────────────────
interface DrawdownChartProps {
  data: { trade: number; cumPnL: number; drawdown: number; runningMax: number }[]
}
export function DrawdownChart({ data }: DrawdownChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="trade" tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `$${v}`} width={52} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
        <Tooltip
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name === 'drawdown' ? 'Drawdown' : 'Cum PnL']}
        />
        <Line type="monotone" dataKey="cumPnL"   stroke="#3b82f6" strokeWidth={1.5} dot={false} name="cumPnL" />
        <Line type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1}   dot={false} name="drawdown" strokeDasharray="3 2" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Rolling Expectancy Chart ───────────────────────────────────────────────────
interface RollingExpProps {
  data: { trade: number; value: number | null }[]
}
export function RollingExpChart({ data }: RollingExpProps) {
  const filtered = data.filter(d => d.value !== null)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={filtered} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="trade" tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `$${v}`} width={44} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 2" />
        <Tooltip
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          formatter={(v: number) => [`$${v.toFixed(2)}`, '20T Expectancy']}
        />
        <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={1.5} dot={false}
          name="Rolling Exp" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Weekday Bar Chart ─────────────────────────────────────────────────────────
interface WeekdayBarProps {
  data: { day: string; netPnL: number; winRate: number; trades: number }[]
}
export function WeekdayBar({ data }: WeekdayBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="day" tickFormatter={v => v.slice(0,3)}
          tick={{ fill: TICK_COLOR, fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `$${v}`} width={44} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
        <Tooltip
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          formatter={(v: number, _: string, p) => [
            `$${v.toFixed(0)} · ${p.payload.winRate}% WR · ${p.payload.trades}T`, 'Net PnL'
          ]}
        />
        <Bar dataKey="netPnL" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.netPnL >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── MFE / MAE Scatter ─────────────────────────────────────────────────────────
import { ScatterChart, Scatter, ZAxis } from 'recharts'

interface ScatterPoint { mfe: number; mae: number; pnl: number; win: boolean }
interface MFEMAEScatterProps { data: ScatterPoint[] }

export function MFEMAEScatter({ data }: MFEMAEScatterProps) {
  const wins   = data.filter(d => d.win)
  const losses = data.filter(d => !d.win)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="mfe" name="MFE" type="number"
          tick={{ fill: TICK_COLOR, fontSize: 9 }} axisLine={false} tickLine={false}
          label={{ value: 'MFE ($)', fill: TICK_COLOR, fontSize: 9, position: 'insideBottom', offset: -2 }} />
        <YAxis dataKey="mae" name="MAE" type="number"
          tick={{ fill: TICK_COLOR, fontSize: 9 }} axisLine={false} tickLine={false}
          tickFormatter={v => `$${v}`} width={40} />
        <ZAxis range={[30, 30]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }}
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name]}
        />
        <Scatter data={wins}   fill="#22c55e" fillOpacity={0.6} name="Win" />
        <Scatter data={losses} fill="#ef4444" fillOpacity={0.6} name="Loss" />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// ── Hour Heatmap ──────────────────────────────────────────────────────────────
// Renders as SVG inline — no recharts needed
interface HeatmapCell { bucket: string; winRate: number; trades: number; netPnL: number }
interface HourHeatmapProps { data: HeatmapCell[] }

export function HourHeatmap({ data }: HourHeatmapProps) {
  if (!data.length) return null
  const maxTrades = Math.max(...data.map(d => d.trades))

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {data.map(d => {
        const wr    = d.winRate
        const alpha = 0.15 + (d.trades / maxTrades) * 0.7
        const bg    = wr >= 65
          ? `rgba(34,197,94,${alpha})`
          : wr >= 45
            ? `rgba(245,158,11,${alpha})`
            : `rgba(239,68,68,${alpha})`
        const border = wr >= 65 ? 'rgba(34,197,94,0.4)' : wr >= 45 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'

        return (
          <div key={d.bucket} title={`${d.bucket}: ${d.winRate}% WR · ${d.trades}T · $${d.netPnL.toFixed(0)}`}
            style={{
              background: bg, border: `1px solid ${border}`,
              borderRadius: 6, padding: '6px 8px', minWidth: 70, textAlign: 'center',
            }}>
            <div style={{ fontSize: 9, color: 'var(--t2)', marginBottom: 3 }}>{d.bucket}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: wr >= 65 ? 'var(--green)' : wr >= 45 ? 'var(--amber)' : 'var(--red)' }}>
              {d.winRate}%
            </div>
            <div style={{ fontSize: 9, color: 'var(--t3)' }}>{d.trades}T</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Monte Carlo Chart ─────────────────────────────────────────────────────────
interface MCPoint { trade: number; p5: number; p25: number; p50: number; p75: number; p95: number }
interface MonteCarloChartProps { data: MCPoint[] }

export function MonteCarloChart({ data }: MonteCarloChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="trade" tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false} label={{ value: 'trades', fill: TICK_COLOR, fontSize: 8, position: 'insideBottomRight', offset: -4 }} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 9 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `$${v}`} width={52} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 2" />
        <Tooltip
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          formatter={(v: number, name: string) => [`$${(v as number).toFixed(0)}`, name]}
        />
        <Line type="monotone" dataKey="p95" stroke="rgba(34,197,94,0.5)"  strokeWidth={1} dot={false} strokeDasharray="5 2" name="95th pct" />
        <Line type="monotone" dataKey="p75" stroke="rgba(59,130,246,0.45)" strokeWidth={1} dot={false} name="75th pct" />
        <Line type="monotone" dataKey="p50" stroke="#3b82f6"               strokeWidth={2} dot={false} name="Median" />
        <Line type="monotone" dataKey="p25" stroke="rgba(59,130,246,0.45)" strokeWidth={1} dot={false} name="25th pct" />
        <Line type="monotone" dataKey="p5"  stroke="rgba(239,68,68,0.55)" strokeWidth={1} dot={false} strokeDasharray="5 2" name="5th pct" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Streak Chart ──────────────────────────────────────────────────────────────
interface StreakPoint { trade: number; streak: number }
interface StreakChartProps { data: StreakPoint[] }

export function StreakChart({ data }: StreakChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="trade" tick={{ fill: TICK_COLOR, fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 9 }} axisLine={false} tickLine={false} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
        <Tooltip
          contentStyle={{ background: '#181c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
          formatter={(v: number) => [v > 0 ? `+${v} win streak` : `${v} loss streak`, '']}
        />
        <Bar dataKey="streak" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.streak > 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
