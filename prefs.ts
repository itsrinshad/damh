// Per-device display preferences (text size, lite mode, music). The colour THEME is no longer a personal choice:
// it is set by the admins for the whole site (see siteStyle.ts).
import { useEffect, useState } from 'react'

export type Prefs = { theme: string; lite: boolean; font: number; music: boolean; vol: number; fx: number; bri: number; sat: number; con: number; own: boolean }
const K = 'sym_prefs2'
const low = () => { const m = (navigator as any).deviceMemory; return !!m && m <= 2 }
const def = (): Prefs => ({ theme: 'royal', lite: low(), font: 16, music: true, vol: 0.4, fx: 65, bri: 95, sat: 105, con: 105, own: false })
export const getPrefs = (): Prefs => { try { return { ...def(), ...JSON.parse(localStorage.getItem(K) || '{}') } } catch { return def() } }

/** Rough device strength. "low" devices still show every profile effect, just drawn the cheap way (see index.css [data-perf=low]). */
export type Perf = 'low' | 'mid' | 'high'
let tier: Perf | null = null
export const perfTier = (): Perf => {
  if (tier) return tier
  try {
    const n = navigator as any; const mem = n.deviceMemory as number | undefined; const cores = n.hardwareConcurrency as number | undefined
    const save = !!n.connection?.saveData; const slowNet = /(^|-)2g$/.test(n.connection?.effectiveType ?? '')
    tier = save || slowNet || (mem && mem <= 2) || (cores && cores <= 4 && (!mem || mem <= 4)) ? 'low' : (mem && mem <= 4) || (cores && cores <= 6) ? 'mid' : 'high'
  } catch { tier = 'mid' }
  return tier!
}
/** True when the visitor asked for less data/motion: videos stay as still pictures until tapped. */
export const saveData = () => { try { return !!(navigator as any).connection?.saveData } catch { return false } }

export const applyPrefs = (p: Prefs = getPrefs()) => { const r = document.documentElement; r.dataset.lite = p.lite ? '1' : '0'; r.dataset.perf = perfTier(); r.style.fontSize = p.font + 'px'; window.dispatchEvent(new Event('sym-fx-apply')) }
export const setPrefs = (patch: Partial<Prefs>) => { const n = { ...getPrefs(), ...patch }; try { localStorage.setItem(K, JSON.stringify(n)) } catch { /* private mode */ } applyPrefs(n); window.dispatchEvent(new Event('sym-prefs')); return n }
export function usePrefs() { const [p, setP] = useState(getPrefs()); useEffect(() => { const f = () => setP(getPrefs()); window.addEventListener('sym-prefs', f); return () => window.removeEventListener('sym-prefs', f) }, []); return p }
