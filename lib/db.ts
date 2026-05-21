import { supabase } from './supabase'
import type { Trade } from '@/types'

// ── Sessions ──────────────────────────────────────────────────────────────────
// Stores the full parsed trade dataset so it survives page refresh.
// Keyed by a slug of the file name — re-importing the same file overwrites.

function sessionId(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)
}

export async function saveSession(fileName: string, trades: Trade[]): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('sessions')
    .upsert({ id: sessionId(fileName), file_name: fileName, trades })
  if (error) console.error('[WME] saveSession error:', error.message, error.code)
}

export async function loadLatestSession(): Promise<{ id: string; fileName: string; trades: Trade[] } | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('sessions')
    .select('id, file_name, trades')
    .order('imported_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) console.error('[WME] loadLatestSession error:', error.message, error.code)
  if (!data) return null
  return { id: data.id, fileName: data.file_name, trades: data.trades as Trade[] }
}

// Merge new trades into the latest Supabase session, skipping duplicates.
// Deduplication key: Entry DateTime + Entry Price + Trade Type.
// Returns { merged, added } — added is the count of genuinely new trades.
export async function mergeIntoLatestSession(
  newTrades: Trade[]
): Promise<{ merged: Trade[]; added: number }> {
  if (!supabase) return { merged: newTrades, added: newTrades.length }

  const existing = await loadLatestSession()
  if (!existing || existing.trades.length === 0) {
    return { merged: newTrades, added: newTrades.length }
  }

  const fp = (t: Trade) => `${t['Entry DateTime']}|${t['Entry Price']}|${t['Trade Type']}`
  const seen = new Set(existing.trades.map(fp))
  const uniqueNew = newTrades.filter(t => !seen.has(fp(t)))

  if (uniqueNew.length === 0) return { merged: existing.trades, added: 0 }

  const offset = existing.trades.length
  const merged = [
    ...existing.trades,
    ...uniqueNew.map((t, i) => ({ ...t, id: String(offset + i) })),
  ]

  const { error } = await supabase
    .from('sessions')
    .upsert({ id: existing.id, file_name: existing.fileName, trades: merged })
  if (error) console.error('[WME] mergeIntoLatestSession error:', error.message)

  return { merged, added: uniqueNew.length }
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function loadAllTags(): Promise<Record<string, string[]>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('trade_tags').select('trade_id, tags')
  if (error) console.error('[WME] loadAllTags error:', error.message, error.code)
  if (!data) return {}
  return Object.fromEntries(
    (data as { trade_id: string; tags: string[] }[]).map(r => [r.trade_id, r.tags])
  )
}

export async function upsertTag(tradeId: string, tags: string[]): Promise<void> {
  if (!supabase) return
  if (tags.length === 0) {
    await supabase.from('trade_tags').delete().eq('trade_id', tradeId)
  } else {
    await supabase.from('trade_tags').upsert({ trade_id: tradeId, tags })
  }
}

// ── Setup notes ───────────────────────────────────────────────────────────────

export async function loadAllSetupNotes(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data } = await supabase.from('setup_notes').select('setup_name, note')
  if (!data) return {}
  return Object.fromEntries(
    (data as { setup_name: string; note: string }[]).map(r => [r.setup_name, r.note])
  )
}

export async function upsertSetupNote(setupName: string, note: string): Promise<void> {
  if (!supabase) return
  await supabase.from('setup_notes').upsert({ setup_name: setupName, note })
}

// ── Screenshot helpers ────────────────────────────────────────────────────────

// Files under 500 KB upload as-is. Larger files get resized to 1200px JPEG 0.8.
export function compressImageFile(file: File): Promise<string> {
  if (file.size < 500 * 1024) {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let w = img.width, h = img.height
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.src = url
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// ── Setup screenshots (Supabase Storage) ─────────────────────────────────────
// Bucket: setup-screenshots  |  path: {setupName}.jpg

function screenshotPath(setupName: string) {
  return `${setupName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
}

async function uploadToStorage(path: string, blob: Blob): Promise<{ url: string | null; error: string | null }> {
  const { error } = await supabase!.storage
    .from('setup-screenshots')
    .upload(path, blob, { upsert: true, contentType: blob.type })
  if (error) {
    console.error('[WME] Storage upload error:', error)
    return { url: null, error: error.message }
  }
  const { data } = supabase!.storage.from('setup-screenshots').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

export async function uploadSetupScreenshot(
  setupName: string,
  dataUrl: string
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: 'Supabase not configured' }
  return uploadToStorage(screenshotPath(setupName), dataUrlToBlob(dataUrl))
}

// ── Trade screenshots (Supabase Storage) ─────────────────────────────────────
// Bucket: setup-screenshots  |  path: trades/{tradeId}.jpg

function tradeScreenshotPath(tradeId: string) {
  return `trades/${tradeId.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
}

export async function uploadTradeScreenshot(
  tradeId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: 'Supabase not configured' }
  const dataUrl = await compressImageFile(file)
  return uploadToStorage(tradeScreenshotPath(tradeId), dataUrlToBlob(dataUrl))
}

export function getTradeScreenshotUrl(tradeId: string): string | null {
  if (!supabase) return null
  const { data } = supabase.storage.from('setup-screenshots').getPublicUrl(tradeScreenshotPath(tradeId))
  return data.publicUrl
}

export async function deleteTradeScreenshot(tradeId: string): Promise<void> {
  if (!supabase) return
  await supabase.storage.from('setup-screenshots').remove([tradeScreenshotPath(tradeId)])
}

export async function deleteSetupScreenshot(setupName: string): Promise<void> {
  if (!supabase) return
  await supabase.storage
    .from('setup-screenshots')
    .remove([screenshotPath(setupName)])
}

export function getSetupScreenshotPublicUrl(setupName: string): string | null {
  if (!supabase) return null
  const { data } = supabase.storage
    .from('setup-screenshots')
    .getPublicUrl(screenshotPath(setupName))
  return data.publicUrl
}
