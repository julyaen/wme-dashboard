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
  await supabase
    .from('sessions')
    .upsert({ id: sessionId(fileName), file_name: fileName, trades })
}

export async function loadLatestSession(): Promise<{ fileName: string; trades: Trade[] } | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('sessions')
    .select('file_name, trades')
    .order('imported_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { fileName: data.file_name, trades: data.trades as Trade[] }
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function loadAllTags(): Promise<Record<string, string[]>> {
  if (!supabase) return {}
  const { data } = await supabase.from('trade_tags').select('trade_id, tags')
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

// ── Setup screenshots (Supabase Storage) ─────────────────────────────────────
// Stores compressed JPEG in the `setup-screenshots` bucket.
// Returns the public URL on upload, null on failure.

function screenshotPath(setupName: string) {
  return `${setupName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
}

export async function uploadSetupScreenshot(
  setupName: string,
  dataUrl: string
): Promise<string | null> {
  if (!supabase) return null
  const [, base64] = dataUrl.split(',')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'image/jpeg' })

  const { error } = await supabase.storage
    .from('setup-screenshots')
    .upload(screenshotPath(setupName), blob, { upsert: true, contentType: 'image/jpeg' })
  if (error) return null

  const { data } = supabase.storage
    .from('setup-screenshots')
    .getPublicUrl(screenshotPath(setupName))
  return data.publicUrl
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
