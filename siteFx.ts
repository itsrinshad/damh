// Site-wide "look & effects" (contrast, glow, premium effects). ONLY admins change the site defaults; every member sees them live.
// Members can still tone things down on their own device (Settings > Colour & effects); "Use site default" undoes that.
// Stored in the existing `site_settings` table under the key "site_fx" (same table the Site style uses).
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './lib'
import { getPrefs, perfTier } from './prefs'

export type Pfx = { aurora: boolean; sheen: boolean; spot: boolean; grain: boolean; foil: boolean; gold: boolean; vig: boolean; chain: boolean }
export type SiteFx = { fx: number; bri: number; sat: number; con: number; preset: 'clean' | 'premium' | 'ultra' | 'custom'; p: Pfx }

export const PFX_LABELS: { k: keyof Pfx; name: string; tip: string; heavy?: boolean }[] = [
  { k: 'foil', name: 'Gold foil logo & titles', tip: 'A slow light sweep across the logo and headings' },
  { k: 'gold', name: 'Animated gold borders', tip: 'A moving gold edge on the top player and event card' },
  { k: 'sheen', name: 'Button shine', tip: 'A soft glint that passes over buttons and highlights', heavy: true },
  { k: 'vig', name: 'Cinematic vignette', tip: 'Darkens the screen edges so the centre feels lit' },
  { k: 'aurora', name: 'Aurora glow', tip: 'Slow drifting colour light behind everything', heavy: true },
  { k: 'spot', name: 'Spotlight on cards (PC)', tip: 'Cards light up under the mouse pointer', heavy: true },
  { k: 'grain', name: 'Film grain', tip: 'A very fine texture that makes dark areas look rich', heavy: true },
  { k: 'chain', name: 'Chains on the edges', tip: 'The guild chains down both sides of the page' },
]
const NONE: Pfx = { aurora: false, sheen: false, spot: false, grain: false, foil: false, gold: false, vig: false, chain: false }
export const PRESETS: Record<'clean' | 'premium' | 'ultra', SiteFx> = {
  clean: { fx: 50, bri: 95, sat: 100, con: 100, preset: 'clean', p: NONE },
  premium: { fx: 65, bri: 95, sat: 105, con: 105, preset: 'premium', p: { ...NONE, foil: true, gold: true, sheen: true, vig: true } },
  ultra: { fx: 80, bri: 100, sat: 110, con: 110, preset: 'ultra', p: { aurora: true, sheen: true, spot: true, grain: true, foil: true, gold: true, vig: true, chain: true } },
}
const CACHE = 'sym_site_fx'
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d }
export const cleanFx = (v: any): SiteFx => {
  const d = PRESETS.premium; if (!v || typeof v !== 'object') return d
  const p = { ...NONE }; (Object.keys(NONE) as (keyof Pfx)[]).forEach(k => { p[k] = !!v.p?.[k] })
  return { fx: num(v.fx, 0, 150, d.fx), bri: num(v.bri, 40, 130, d.bri), sat: num(v.sat, 30, 150, d.sat), con: num(v.con, 70, 140, d.con), preset: ['clean', 'premium', 'ultra'].includes(v.preset) ? v.preset : 'custom', p }
}
let state: SiteFx = (() => { try { return cleanFx(JSON.parse(localStorage.getItem(CACHE) || 'null')) } catch { return PRESETS.premium } })()
let ver = 0; let started = false
const subs = new Set<() => void>(); const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

/** What this phone actually uses: the member's own sliders if they changed them, otherwise the admin's site defaults. */
export const effectiveFx = (s: SiteFx = state) => { const p = getPrefs(); return p.own ? { fx: p.fx, bri: p.bri, sat: p.sat, con: p.con } : { fx: s.fx, bri: s.bri, sat: s.sat, con: s.con } }
let spotOn = false
const onMove = (e: PointerEvent) => { const t = (e.target as HTMLElement | null)?.closest?.('.glass,.hm-t,.ev-card') as HTMLElement | null; if (!t) return; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', e.clientX - r.left + 'px'); t.style.setProperty('--my', e.clientY - r.top + 'px') }
export function applyFxVars(s: SiteFx = state) {
  const r = document.documentElement; const e = effectiveFx(s); const pr = getPrefs()
  r.style.setProperty('--fx', String(e.fx / 100)); r.style.setProperty('--bri', String(e.bri / 100)); r.style.setProperty('--sat', String(e.sat / 100)); r.style.setProperty('--con', String(e.con / 100))
  // heavy effects are switched off automatically on weak phones, Lite mode, Data Saver and reduced-motion
  const calm = pr.lite || perfTier() === 'low' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ;(Object.keys(NONE) as (keyof Pfx)[]).forEach(k => { const heavy = PFX_LABELS.find(x => x.k === k)?.heavy; const on = s.p[k] && !(calm && heavy) && !(k === 'spot' && !window.matchMedia?.('(hover: hover)').matches); if (on) r.setAttribute('data-p-' + k, '1'); else r.removeAttribute('data-p-' + k) })
  const want = r.hasAttribute('data-p-spot'); if (want && !spotOn) { window.addEventListener('pointermove', onMove, { passive: true }); spotOn = true } else if (!want && spotOn) { window.removeEventListener('pointermove', onMove); spotOn = false }
}
const bump = () => { ver++; applyFxVars(); subs.forEach(f => f()) }
const set = (s: SiteFx) => { state = s; try { localStorage.setItem(CACHE, JSON.stringify(s)) } catch { /* private mode */ } bump() }

async function pull() { try { const r = await supabase.from('site_settings').select('value').eq('key', 'site_fx').maybeSingle(); if (!r.error) set(r.data?.value ? cleanFx(r.data.value) : PRESETS.premium) } catch { /* offline: keep what we have */ } }
export function startSiteFx() {
  applyFxVars(); if (started) return; started = true
  window.addEventListener('sym-prefs', () => applyFxVars()); window.addEventListener('sym-fx-apply', () => applyFxVars())
  pull()
  try { supabase.channel('site-fx-live').on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (p: any) => { if (p.new?.key === 'site_fx') set(cleanFx(p.new.value)) }) } catch { /* polling still works */ }
  window.setInterval(() => { if (!document.hidden) pull() }, 120000)
}
export function useSiteFx(): SiteFx { useSyncExternalStore(sub, () => ver, () => ver); useEffect(() => { startSiteFx() }, []); return state }
/** Admin screen: show a change on this phone right now, without saving it for everyone. */
export const previewSiteFx = (s: SiteFx) => applyFxVars(s)
export const revertPreview = () => applyFxVars(state)
export async function saveSiteFx(s: SiteFx): Promise<string | null> {
  const clean = cleanFx(s); const { error } = await supabase.from('site_settings').upsert({ key: 'site_fx', value: clean, updated_at: new Date().toISOString() })
  if (error) return error.message; set(clean); return null
}
