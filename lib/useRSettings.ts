'use client'
import { useState, useEffect } from 'react'

const LS_KEY = 'wme_r_settings'

export type RMode = 'points' | 'dollars'

export interface RSettings {
  mode: RMode
  value: number
}

const DEFAULTS: RSettings = { mode: 'points', value: 20 }

export function useRSettings() {
  const [settings, setSettings] = useState<RSettings>(DEFAULTS)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) setSettings(JSON.parse(stored))
    } catch {}
  }, [])

  const update = (next: RSettings) => {
    setSettings(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }

  return { settings, update }
}

// Returns the dollar risk for a given trade quantity based on current settings
// Points mode: value pts × $2/pt × qty  (MNQ = $2 per point)
// Dollars mode: flat dollar amount regardless of quantity
export function computeRisk(qty: number, settings: RSettings): number {
  return settings.mode === 'points'
    ? settings.value * 2 * qty
    : settings.value
}
