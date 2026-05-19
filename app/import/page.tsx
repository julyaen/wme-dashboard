'use client'
import { useCallback, useState } from 'react'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const { loadFile, loading, error, fileName, trades } = useStore()
  const [dragging, setDragging] = useState(false)
  const router = useRouter()

  const process = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result instanceof ArrayBuffer) {
        loadFile(e.target.result, file.name)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [loadFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) process(file)
  }, [process])

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) process(file)
  }

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Import data</h1>
        <p style={{ color: 'var(--t3)', fontSize: 12 }}>
          Upload your normalized WME xlsx file. All analytics are computed instantly in-browser.
        </p>
      </div>

      <div
        className="card"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--blue)' : 'rgba(255,255,255,0.15)'}`,
          background: dragging ? 'rgba(59,130,246,0.06)' : 'var(--bg2)',
          borderRadius: 12,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>↑</div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
          Drop your xlsx file here or click to browse
        </div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 16 }}>
          wme_fasterV2_normalized.xlsx · Sierra Chart merged export
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {['.xlsx','.xls'].map(f => (
            <span key={f} className="badge badge-gray">{f}</span>
          ))}
        </div>
        <input id="fileInput" type="file" accept=".xlsx,.xls"
          style={{ display: 'none' }} onChange={onInput} />
      </div>

      {loading && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ color: 'var(--t2)', fontSize: 12 }}>⟳ Parsing file...</div>
          <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--blue)', borderRadius: 2, width: '60%', animation: 'pulse 1s infinite' }} />
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginTop: 12, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
          <div style={{ color: 'var(--red)', fontSize: 12 }}>✗ {error}</div>
          <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 4 }}>
            Make sure the file is a valid WME normalized export with trade and market columns.
          </div>
        </div>
      )}

      {trades.length > 0 && !loading && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>📊</div>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>{fileName}</div>
              <div style={{ color: 'var(--t3)', fontSize: 11 }}>
                {trades.length} trades loaded · ready to analyse
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
              onClick={() => router.push('/')}>
              View dashboard →
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Expected columns</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 16px', fontSize: 11, color: 'var(--t3)' }}>
          {[
            'Note / Setup','Trade Type','Entry DateTime','Exit DateTime',
            'Profit/Loss (C)','Net PnL','Max Open Profit (C)','Max Open Loss (C)',
            'Commission (C)','Entry Price','Exit Price',
            '2kWave','2mWave','30mWave','30sWave',
            'E8_2kCL','E8_2mCL','Delta%','BullishDSS','BearishDSS',
            'DWask','DWbid','wASK','wBID','ASK>1050','BID<950',
            'Entry >VWAP','Entry >TB1','Entry >TB2',
          ].map(c => <div key={c} style={{ padding: '2px 0', borderBottom: '1px solid var(--border)' }}>{c}</div>)}
        </div>
      </div>
    </div>
  )
}
