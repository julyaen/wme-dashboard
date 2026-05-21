'use client'
import { useState, useEffect, useCallback } from 'react'
import { uploadTradeScreenshot, getTradeScreenshotUrl, deleteTradeScreenshot } from '@/lib/db'
import { hasSupabase } from '@/lib/supabase'

const LS_KEY = 'wme_screenshots'

function getIndex(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} }
}
function saveIndex(index: Record<string, boolean>) {
  localStorage.setItem(LS_KEY, JSON.stringify(index))
}

export function useScreenshotIndex() {
  const [index, setIndexState] = useState<Record<string, boolean>>({})
  useEffect(() => { setIndexState(getIndex()) }, [])
  const markExists = useCallback((tradeId: string, exists: boolean) => {
    const next = getIndex()
    if (exists) next[tradeId] = true
    else delete next[tradeId]
    saveIndex(next)
    setIndexState({ ...next })
  }, [])
  return { index, markExists }
}

interface ScreenshotState {
  exists: boolean
  url: string | null
  loading: boolean
  uploading: boolean
  error: string | null
}

export function useScreenshot(tradeId: string) {
  const [state, setState] = useState<ScreenshotState>({
    exists: false, url: null, loading: false, uploading: false, error: null,
  })

  useEffect(() => {
    if (!hasSupabase) return
    // If localStorage says a screenshot exists, try loading it from Supabase
    if (!getIndex()[tradeId]) return
    const url = getTradeScreenshotUrl(tradeId)
    if (url) setState(s => ({ ...s, exists: true, url }))
  }, [tradeId])

  const upload = useCallback(async (file: File) => {
    if (!hasSupabase) {
      setState(s => ({ ...s, error: 'Supabase not configured — screenshots require Supabase Storage.' }))
      return
    }
    setState(s => ({ ...s, uploading: true, error: null }))
    const { url, error } = await uploadTradeScreenshot(tradeId, file)
    if (url) {
      setState({ exists: true, url, loading: false, uploading: false, error: null })
      const idx = getIndex(); idx[tradeId] = true; saveIndex(idx)
    } else {
      setState(s => ({ ...s, uploading: false, error: `Upload failed: ${error ?? 'unknown error'}` }))
    }
  }, [tradeId])

  const remove = useCallback(async () => {
    setState(s => ({ ...s, uploading: true, error: null }))
    await deleteTradeScreenshot(tradeId)
    setState({ exists: false, url: null, loading: false, uploading: false, error: null })
    const idx = getIndex(); delete idx[tradeId]; saveIndex(idx)
  }, [tradeId])

  return { ...state, upload, remove }
}
