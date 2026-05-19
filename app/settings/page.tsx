'use client'
import { useStore } from '@/lib/store'

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

export default function SettingsPage() {
  const { trades, fileName, clearData } = useStore()

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
