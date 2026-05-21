'use client'
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { useRSettings } from '@/lib/useRSettings'
import { supabase, hasSupabase } from '@/lib/supabase'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="card-title" style={{ marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--t1)' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

type CheckStatus = 'idle' | 'checking' | 'ok' | 'error'
interface Check { status: CheckStatus; message: string }

function StatusDot({ status }: { status: CheckStatus }) {
  const color = status === 'ok' ? 'var(--green)' : status === 'error' ? 'var(--red)' : status === 'checking' ? 'var(--amber)' : 'var(--t3)'
  const label = status === 'ok' ? '●' : status === 'error' ? '●' : status === 'checking' ? '◌' : '○'
  return <span style={{ color, fontSize: 14, lineHeight: 1 }}>{label}</span>
}

export default function SettingsPage() {
  const { trades, fileName, clearData } = useStore()
  const { settings: r, update: updateR } = useRSettings()

  const [dbCheck,      setDbCheck]      = useState<Check>({ status: 'idle', message: '' })
  const [storageCheck, setStorageCheck] = useState<Check>({ status: 'idle', message: '' })

  const runChecks = useCallback(async () => {
    if (!hasSupabase || !supabase) {
      setDbCheck({ status: 'error', message: 'No credentials — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment variables.' })
      setStorageCheck({ status: 'error', message: 'No credentials.' })
      return
    }

    setDbCheck({ status: 'checking', message: 'Testing…' })
    setStorageCheck({ status: 'checking', message: 'Testing…' })

    // Test database: query sessions table
    const { error: dbErr } = await supabase.from('sessions').select('id').limit(1)
    if (dbErr) {
      setDbCheck({ status: 'error', message: dbErr.message })
    } else {
      setDbCheck({ status: 'ok', message: 'Connected — sessions table found.' })
    }

    // Test storage: list setup-screenshots bucket
    const { error: stErr } = await supabase.storage.from('setup-screenshots').list('', { limit: 1 })
    if (stErr) {
      setStorageCheck({ status: 'error', message: stErr.message })
    } else {
      setStorageCheck({ status: 'ok', message: 'Connected — setup-screenshots bucket found.' })
    }
  }, [])

  useEffect(() => { runChecks() }, [runChecks])

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--t3)', fontSize: 12 }}>Application preferences and data management.</p>
      </div>

      <Section title="Data">
        <Field label="Loaded file" sub="Currently active dataset">
          <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'monospace' }}>
            {fileName || '—'}
          </span>
        </Field>
        <Field label="Trades loaded" sub="Total rows parsed from file">
          <span style={{ fontSize: 13, fontWeight: 500, color: trades.length ? 'var(--green)' : 'var(--t3)' }}>
            {trades.length.toLocaleString()}
          </span>
        </Field>
        <Field label="Clear data" sub="Removes all loaded trades from memory">
          <button
            onClick={clearData}
            disabled={!trades.length}
            style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 6,
              border: '1px solid rgba(239,68,68,0.4)',
              background: trades.length ? 'rgba(239,68,68,0.1)' : 'var(--bg3)',
              color: trades.length ? 'var(--red)' : 'var(--t3)',
              cursor: trades.length ? 'pointer' : 'not-allowed',
            }}
          >Clear data</button>
        </Field>
      </Section>

      <Section title="Display">
        <Field label="Theme" sub="Currently dark mode only">
          <span className="badge badge-gray">Dark</span>
        </Field>
        <Field label="Default page size" sub="Rows per page in journal">
          <span className="badge badge-gray">50 rows</span>
        </Field>
        <Field label="Currency" sub="Displayed throughout the app">
          <span className="badge badge-gray">USD ($)</span>
        </Field>
      </Section>

      <Section title="R-Multiple">
        <Field label="Calculation mode" sub="How your risk denominator is defined">
          <div style={{ display: 'flex', gap: 4 }}>
            {(['points', 'dollars'] as const).map(m => (
              <button key={m} onClick={() => updateR({ ...r, mode: m })} style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 5,
                border: '1px solid',
                borderColor: r.mode === m ? 'var(--blue)' : 'var(--border2)',
                background: r.mode === m ? 'rgba(59,130,246,0.15)' : 'var(--bg3)',
                color: r.mode === m ? 'var(--blue)' : 'var(--t3)',
                cursor: 'pointer', fontWeight: r.mode === m ? 500 : 400,
              }}>
                {m === 'points' ? 'Points' : 'Dollars'}
              </button>
            ))}
          </div>
        </Field>
        <Field
          label={r.mode === 'points' ? 'Stop loss in points' : 'Risk per trade ($)'}
          sub={r.mode === 'points'
            ? `MNQ: ${r.value} pts × $2 = $${r.value * 2} per contract`
            : `Flat dollar risk applied to every trade`}
        >
          <input
            type="number" min={1} value={r.value}
            onChange={e => updateR({ ...r, value: Math.max(1, Number(e.target.value)) })}
            style={{
              width: 90, background: 'var(--bg2)', border: '1px solid var(--border2)',
              borderRadius: 5, padding: '5px 8px', fontSize: 13,
              color: 'var(--t1)', outline: 'none', textAlign: 'right',
              fontFamily: 'monospace',
            }}
          />
        </Field>
        <Field label="Current 1-contract risk" sub="Dollar risk for a single contract trade">
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--amber)', fontFamily: 'monospace' }}>
            ${r.mode === 'points' ? (r.value * 2).toFixed(0) : r.value.toFixed(0)}
          </span>
        </Field>
      </Section>

      <Section title="Supabase">
        <Field label="Credentials" sub="NEXT_PUBLIC_SUPABASE_URL + ANON_KEY">
          {hasSupabase
            ? <span className="badge badge-green">Configured</span>
            : <span className="badge badge-red">Missing</span>}
        </Field>
        <Field label="Database" sub="sessions, trade_tags, setup_notes tables">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot status={dbCheck.status} />
            <span style={{ fontSize: 10, color: dbCheck.status === 'error' ? 'var(--red)' : 'var(--t3)', maxWidth: 280 }}>
              {dbCheck.message || '—'}
            </span>
          </div>
        </Field>
        <Field label="Storage" sub="setup-screenshots bucket (screenshots)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot status={storageCheck.status} />
            <span style={{ fontSize: 10, color: storageCheck.status === 'error' ? 'var(--red)' : 'var(--t3)', maxWidth: 280 }}>
              {storageCheck.message || '—'}
            </span>
          </div>
        </Field>
        <div style={{ paddingTop: 10 }}>
          <button onClick={runChecks} style={{
            fontSize: 11, padding: '5px 14px', borderRadius: 6,
            border: '1px solid var(--border2)', background: 'var(--bg3)',
            color: 'var(--t2)', cursor: 'pointer',
          }}>Re-test connection</button>
        </div>
      </Section>

      <Section title="About">
        <Field label="Application" sub="whatsmyedge trading analytics">
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>v0.1.0</span>
        </Field>
        <Field label="Instrument" sub="Strategy focus">
          <span style={{ fontSize: 11, color: 'var(--t2)' }}>MNQ / NQ Futures</span>
        </Field>
        <Field label="Data model" sub="All data stored in-browser, nothing leaves your machine">
          <span className="badge badge-green">Local only</span>
        </Field>
      </Section>
    </div>
  )
}
