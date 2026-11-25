// The site-wide look. ONLY admins can change it; every member's screen follows live.
// Stored in the existing `site_settings` table: key "site_style" = { id } and key "site_effect" = { enabled, html, title }.
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './lib'

export type SiteStyle = { id: string; name: string; tag: string; a: string; b: string }
// ids match the [data-theme=…] colour sets in index.css and the background effects in SiteFx.tsx
export const SITE_STYLES: SiteStyle[] = [
  { id: 'web', name: 'Spider Web', tag: 'Silver strands that bend to your finger', a: '#9AA4B2', b: '#E5484D' },
  { id: 'emerald', name: 'Venom Rain', tag: 'Falling symbiote code', a: '#10B981', b: '#A3E635' },
  { id: 'fire', name: 'Inferno', tag: 'Rising embers and heat glow', a: '#F97316', b: '#FACC15' },
  { id: 'aurora', name: 'Aurora Veil', tag: 'Slow northern-light ribbons', a: '#2DD4BF', b: '#A78BFA' },
  { id: 'cosmic', name: 'Warp Drive', tag: 'Stars streaming past you', a: '#6366F1', b: '#EC4899' },
  { id: 'ice', name: 'Frostbite', tag: 'Snow and ice crystals', a: '#38BDF8', b: '#818CF8' },
  { id: 'cyber', name: 'Neon Grid', tag: 'Synthwave sun and road', a: '#D946EF', b: '#22D3EE' },
  { id: 'sakura', name: 'Sakura Night', tag: 'Petals drifting in the wind', a: '#F472B6', b: '#FBCFE8' },
  { id: 'midnight', name: 'Thunderstorm', tag: 'Rain and lightning flashes', a: '#3B82F6', b: '#22D3EE' },
  { id: 'royal', name: 'Royal Gold', tag: 'Gold dust and slow rays of light', a: '#8B5CF6', b: '#FBBF24' },
]
export type CustomFx = { enabled: boolean; html: string; title: string }
type State = { id: string; custom: CustomFx }
const CACHE = 'sym_site_style'
const NONE: CustomFx = { enabled: false, html: '', title: '' }
const validId = (id: unknown): id is string => typeof id === 'string' && SITE_STYLES.some(s => s.id === id)
const cached = (): State => { try { const c = JSON.parse(localStorage.getItem(CACHE) || '{}'); return { id: validId(c.id) ? c.id : 'royal', custom: NONE } } catch { return { id: 'royal', custom: NONE } } }

let state: State = cached(); let ver = 0; let started = false
const subs = new Set<() => void>(); const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
const apply = () => { document.documentElement.dataset.theme = state.id }
const bump = () => { ver++; apply(); subs.forEach(f => f()) }
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; try { localStorage.setItem(CACHE, JSON.stringify({ id: state.id })) } catch { /* private mode */ } bump() }

const readRow = (key: string, value: any) => {
  if (key === 'site_style' && validId(value?.id) && value.id !== state.id) set({ id: value.id })
  if (key === 'site_effect') set({ custom: value && typeof value.html === 'string' ? { enabled: !!value.enabled, html: value.html, title: String(value.title ?? '') } : NONE })
}
async function pull() {
  try {
    const r = await supabase.from('site_settings').select('key,value').in('key', ['site_style', 'site_effect'])
    if (r.error) return
    const keys = new Set((r.data ?? []).map(x => x.key)); (r.data ?? []).forEach(x => readRow(x.key, x.value))
    if (!keys.has('site_style') && state.id !== 'royal') set({ id: 'royal' })
    if (!keys.has('site_effect') && state.custom.enabled) set({ custom: NONE })
  } catch { /* offline: keep what we have */ }
}
/** Start once (safe to call many times): loads the look, listens for live changes and re-checks every 2 minutes as a backup. */
export function startSiteStyleSync() {
  apply(); if (started) return; started = true
  pull()
  try {
    supabase.channel('site-style-live').on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (p: any) => { const k = p.new?.key; if (k === 'site_style' || k === 'site_effect') readRow(k, p.new.value) }).subscribe()
  } catch { /* realtime not enabled: polling still works */ }
  window.setInterval(() => { if (!document.hidden) pull() }, 120000)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull() })
}
export function useSiteStyle(): State { useSyncExternalStore(sub, () => ver, () => ver); useEffect(() => { startSiteStyleSync() }, []); return state }
export const getSiteStyle = () => state

export async function saveSiteStyle(id: string): Promise<string | null> {
  if (!validId(id)) return 'Unknown style.'
  const { error } = await supabase.from('site_settings').upsert({ key: 'site_style', value: { id }, updated_at: new Date().toISOString() })
  if (error) return error.message; set({ id }); return null
}
export const MAX_FX_BYTES = 60000
export async function saveCustomFx(fx: CustomFx): Promise<string | null> {
  if (fx.html.length > MAX_FX_BYTES) return `That is ${(fx.html.length / 1000).toFixed(0)} KB. The limit is ${MAX_FX_BYTES / 1000} KB.`
  const { error } = await supabase.from('site_settings').upsert({ key: 'site_effect', value: fx, updated_at: new Date().toISOString() })
  if (error) return error.message; set({ custom: fx }); return null
}
