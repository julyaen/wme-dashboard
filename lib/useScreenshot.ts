'use client'
import { useState, useEffect, useCallback } from 'react'

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
  base64: string | null
  mime: string | null
  loading: boolean
  uploading: boolean
  error: string | null
}

export function useScreenshot(tradeId: string) {
  const [state, setState] = useState<ScreenshotState>({
    exists: false, base64: null, mime: null,
    loading: false, uploading: false, error: null,
  })

  const refetch = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res  = await fetch(`/api/screenshots?tradeId=${encodeURIComponent(tradeId)}`)
      const data = await res.json()
      if (data.exists) {
        setState({ exists: true, base64: data.base64, mime: data.mime, loading: false, uploading: false, error: null })
        const idx = getIndex(); idx[tradeId] = true; saveIndex(idx)
      } else {
        setState({ exists: false, base64: null, mime: null, loading: false, uploading: false, error: null })
      }
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Failed to load screenshot' }))
    }
  }, [tradeId])

  useEffect(() => {
    if (getIndex()[tradeId]) refetch()
  }, [tradeId, refetch])

  const upload = useCallback(async (file: File) => {
    setState(s => ({ ...s, uploading: true, error: null }))
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('tradeId', tradeId)
      const res = await fetch('/api/screenshots', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json()
        setState(s => ({ ...s, uploading: false, error: data.error ?? 'Upload failed' }))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const comma = result.indexOf(',')
        const header = result.slice(0, comma)
        const b64  = result.slice(comma + 1)
        const mime = header.replace('data:', '').replace(';base64', '')
        setState({ exists: true, base64: b64, mime, loading: false, uploading: false, error: null })
        const idx = getIndex(); idx[tradeId] = true; saveIndex(idx)
      }
      reader.readAsDataURL(file)
    } catch {
      setState(s => ({ ...s, uploading: false, error: 'Upload failed' }))
    }
  }, [tradeId])

  const remove = useCallback(async () => {
    setState(s => ({ ...s, uploading: true, error: null }))
    try {
      await fetch(`/api/screenshots?tradeId=${encodeURIComponent(tradeId)}`, { method: 'DELETE' })
      setState({ exists: false, base64: null, mime: null, loading: false, uploading: false, error: null })
      const idx = getIndex(); delete idx[tradeId]; saveIndex(idx)
    } catch {
      setState(s => ({ ...s, uploading: false, error: 'Remove failed' }))
    }
  }, [tradeId])

  return { ...state, refetch, upload, remove }
}
