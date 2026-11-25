// Items an admin has hidden from the style catalogue (stored in site_settings "hidden_items"). Hidden items vanish from the lists but anything already worn still renders.
import { useSyncExternalStore } from 'react'
import { supabase } from './lib'
let hidden = new Set<string>(); let snap = hidden; const subs = new Set<() => void>(); let loaded = false
const emit = () => { snap = new Set(hidden); subs.forEach(f => f()) }
export async function loadHidden() { const r = await supabase.from('site_settings').select('value').eq('key', 'hidden_items').maybeSingle(); const c = (r.data?.value as { codes?: string[] } | null)?.codes; hidden = new Set(Array.isArray(c) ? c : []); loaded = true; emit() }
export async function saveHidden(codes: string[]): Promise<string | null> {
  const r = await supabase.from('site_settings').upsert({ key: 'hidden_items', value: { codes }, updated_at: new Date().toISOString() }); if (r.error) return r.error.message
  hidden = new Set(codes); emit(); return null
}
export function useHiddenItems(): Set<string> { if (!loaded) { loaded = true; loadHidden() } return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => snap, () => snap) }
