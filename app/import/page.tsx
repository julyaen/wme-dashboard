'use client'
import { useCallback, useState } from 'react'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

type Mode = 'raw' | 'normalized'

function DropZone({
  label, sub, accepts, file, dragging,
  onDrop, onDragOver, onDragLeave, onBrowse, inputId, onChange,
}: {
  label: string
  sub: string
  accepts: string
  file: File | null
  dragging: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onBrowse: () => void
  inputId: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onBrowse}
      style={{
        border: `1.5px dashed ${file ? 'var(--green)' : dragging ? 'var(--blue)' : 'rgba(255,255,255,0.15)'}`,
        background: file ? 'rgba(34,197,94,0.05)' : dragging ? 'rgba(59,130,246,0.06)' : 'var(--bg2)',
        borderRadius: 10,
        padding: '28px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flex: 1,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>
        {file ? '✓' : '↑'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: file ? 'var(--green)' : 'var(--t1)' }}>
        {file ? file.name : label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--t3)' }}>
        {file ? `${(file.size / 1024).toFixed(0)} KB` : sub}
      </div>
      <input id={inputId} type="file" accept={accepts}
        style={{ display: 'none' }} onChange={onChange} />
    </div>
  )
}

export default function ImportPage() {
  const { loadFile, loadFromRaw, loading, error, fileName, trades } = useStore()
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('raw')

  // Raw mode state
  const [marketFile, setMarketFile] = useState<File | null>(null)
  const [tradeFile,  setTradeFile]  = useState<File | null>(null)
  const [dragMarket, setDragMarket] = useState(false)
  const [dragTrade,  setDragTrade]  = useState(false)

  // XLSX mode state
  const [dragXlsx, setDragXlsx] = useState(false)

  // ── Raw mode handlers ────────────────────────────────────────────────────────
  const handleMarketDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragMarket(false)
    const f = e.dataTransfer.files[0]
    if (f) setMarketFile(f)
  }, [])

  const handleTradeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragTrade(false)
    const f = e.dataTransfer.files[0]
    if (f) setTradeFile(f)
  }, [])

  const readAsBuffer = (file: File): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = e => resolve(e.target!.result as ArrayBuffer)
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
      reader.readAsArrayBuffer(file)
    })

  const [fileReadError, setFileReadError] = useState<string | null>(null)

  const runNormalizer = useCallback(async () => {
    if (!marketFile || !tradeFile) return
    setFileReadError(null)
    try {
      const [mBuf, tBuf] = await Promise.all([
        readAsBuffer(marketFile),
        readAsBuffer(tradeFile),
      ])
      loadFromRaw(mBuf, tBuf, `${marketFile.name} + ${tradeFile.name}`)
    } catch (e) {
      setFileReadError(
        e instanceof Error
          ? `Could not read file: ${e.message}`
          : 'Could not read one of the files. Make sure neither file is open or locked by Sierra Chart.'
      )
    }
  }, [marketFile, tradeFile, loadFromRaw])

  // ── XLSX mode handlers ───────────────────────────────────────────────────────
  const processXlsx = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result instanceof ArrayBuffer)
        loadFile(e.target.result, file.name)
    }
    reader.readAsArrayBuffer(file)
  }, [loadFile])

  const onXlsxDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragXlsx(false)
    const f = e.dataTransfer.files[0]
    if (f) processXlsx(f)
  }, [processXlsx])

  const tabStyle = (active: boolean) => ({
    padding: '7px 18px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    borderRadius: 7,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--blue)' : 'transparent',
    color: active ? '#fff' : 'var(--t3)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ padding: 24, maxWidth: 820 }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Import data</h1>
        <p style={{ color: 'var(--t3)', fontSize: 12 }}>
          Drop your raw Sierra Chart files and the app normalizes them directly — no Python script needed.
        </p>
      </div>

      {/* Mode toggle */}
      <div style={{
        display: 'inline-flex', gap: 4, background: 'var(--bg2)',
        borderRadius: 9, padding: 4, marginBottom: 20,
        border: '1px solid var(--border)',
      }}>
        <button style={tabStyle(mode === 'raw')}        onClick={() => setMode('raw')}>
          Raw files (Sierra Chart)
        </button>
        <button style={tabStyle(mode === 'normalized')} onClick={() => setMode('normalized')}>
          Normalized XLSX / CSV
        </button>
      </div>

      {/* ── Raw mode ─────────────────────────────────────────────────────────── */}
      {mode === 'raw' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <DropZone
              label="Drop wme_fasterV2.txt"
              sub="Market data · Sierra Chart bar export"
              accepts=".txt,.csv"
              file={marketFile}
              dragging={dragMarket}
              onDrop={handleMarketDrop}
              onDragOver={e => { e.preventDefault(); setDragMarket(true) }}
              onDragLeave={() => setDragMarket(false)}
              onBrowse={() => document.getElementById('marketInput')?.click()}
              inputId="marketInput"
              onChange={e => { const f = e.target.files?.[0]; if (f) setMarketFile(f) }}
            />
            <DropZone
              label="Drop TradeActivity.xlsx"
              sub="Trade data · Sierra Chart trade export"
              accepts=".xlsx,.xls,.txt,.csv"
              file={tradeFile}
              dragging={dragTrade}
              onDrop={handleTradeDrop}
              onDragOver={e => { e.preventDefault(); setDragTrade(true) }}
              onDragLeave={() => setDragTrade(false)}
              onBrowse={() => document.getElementById('tradeInput')?.click()}
              inputId="tradeInput"
              onChange={e => { const f = e.target.files?.[0]; if (f) setTradeFile(f) }}
            />
          </div>

          <button
            onClick={runNormalizer}
            disabled={!marketFile || !tradeFile || loading}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '10px', fontSize: 13, fontWeight: 600,
              opacity: (!marketFile || !tradeFile || loading) ? 0.4 : 1,
              cursor: (!marketFile || !tradeFile || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⟳  Normalizing...' : '⚡  Normalize & load'}
          </button>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">What this does</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
              {[
                ['1', 'Parses market data bar-by-bar and computes all derived columns (wave states, Delta%, EMA distances, DW ratios, time buckets, band positions)'],
                ['2', 'Drops irrelevant columns (RedBarBlueBar, CPL, text displays, etc.) and binary DSS flags — BullishDSS and BearishDSS stay as 0–100 numeric values'],
                ['3', 'Joins each trade to its closest bar by timestamp on the same date'],
                ['4', 'Computes entry price vs VWAP, TB1/2/3, BB1/2/3'],
              ].map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--blue)', fontWeight: 600, flexShrink: 0 }}>{n}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Normalized mode (XLSX + CSV) ─────────────────────────────────────── */}
      {mode === 'normalized' && (
        <div
          className="card"
          onDragOver={e => { e.preventDefault(); setDragXlsx(true) }}
          onDragLeave={() => setDragXlsx(false)}
          onDrop={onXlsxDrop}
          style={{
            border: `1.5px dashed ${dragXlsx ? 'var(--blue)' : 'rgba(255,255,255,0.15)'}`,
            background: dragXlsx ? 'rgba(59,130,246,0.06)' : 'var(--bg2)',
            borderRadius: 12, padding: '40px 24px',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
          }}
          onClick={() => document.getElementById('xlsxInput')?.click()}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>↑</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
            Drop your normalized file or click to browse
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 16 }}>
            wme_fasterV2_normalized.xlsx / .csv · pre-processed export
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {['.xlsx', '.xls', '.csv'].map(f => (
              <span key={f} className="badge badge-gray">{f}</span>
            ))}
          </div>
          <input id="xlsxInput" type="file" accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) processXlsx(f) }} />
        </div>
      )}

      {/* ── Shared status ────────────────────────────────────────────────────── */}
      {loading && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ color: 'var(--t2)', fontSize: 12, marginBottom: 8 }}>
            {mode === 'raw' ? '⟳  Normalizing and joining files...' : '⟳  Parsing...'}
          </div>
          <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'var(--blue)', borderRadius: 2,
              width: '60%', animation: 'pulse 1s infinite',
            }} />
          </div>
        </div>
      )}

      {fileReadError && (
        <div className="card" style={{ marginTop: 12, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
          <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>✗ File read error</div>
          <div style={{ color: 'var(--red)', fontSize: 11, whiteSpace: 'pre-wrap' }}>{fileReadError}</div>
          <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 6 }}>
            Make sure Sierra Chart is not actively writing to the file and try again.
          </div>
        </div>
      )}

      {/* Hard error from normalizer (red) vs warning / partial load (amber) */}
      {error && !trades.length && (
        <div className="card" style={{ marginTop: 12, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
          <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>✗ Could not load files</div>
          <div style={{ color: 'var(--red)', fontSize: 11, whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      )}

      {error && trades.length > 0 && (() => {
        const isMerge = /^\d+ new trade|^No new trades/.test(error)
        return (
          <div className="card" style={{
            marginTop: 12,
            borderColor: isMerge ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)',
            background: isMerge ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
          }}>
            <div style={{ color: isMerge ? 'var(--green)' : 'var(--amber)', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              {isMerge ? '✓ Merge complete' : '⚠ Loaded with warnings'}
            </div>
            <div style={{ color: isMerge ? 'var(--green)' : 'var(--amber)', fontSize: 11, whiteSpace: 'pre-wrap' }}>{error}</div>
          </div>
        )
      })()}

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
    </div>
  )
}
