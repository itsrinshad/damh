// Gifts: the sender sees a "sent" animation, the receiver sees a "gift unwrapped" animation (live, on any page),
// and everyone can see who gifted what to whom (shown on the Players page for inspiration).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { RARITY, itemOf, type Item } from './styleCatalog'
import { useCustomItems } from './styleStore'
import { ItemPreview, Rarity } from './StyleKit'
import { perfTier } from './prefs'

export type GiftRow = { id: string; from_id: string; to_id: string; item_code: string; note: string | null; created_at: string; seen?: boolean }
export const BUNDLE = '*bundle*'; export const EVERYONE = '*everyone*'
type Sent = { toName: string; itemCode: string; note?: string; many?: number }

/** Tell the whole app a gift was just sent (the sender sees the "sent" animation). */
export const announceSent = (s: Sent) => window.dispatchEvent(new CustomEvent('sym-gift-sent', { detail: s }))
/** Record a gift in the shared gift log (the receiver's animation and the Players page read from it). Safe if the SQL is not installed yet. */
export async function logGift(toId: string, itemCode: string, note: string): Promise<string | null> {
  const r = await supabase.rpc('gift_log_add', { p_to: toId, p_item: itemCode, p_note: note || null }); return r.error ? r.error.message : null
}
export async function logGiftAll(itemCode: string, note: string): Promise<string | null> {
  const r = await supabase.rpc('gift_log_all', { p_item: itemCode, p_note: note || null }); return r.error ? r.error.message : null
}
/** Latest gifts, newest first. */
export function useGiftLog(limit = 200, enabled = true) {
  const [rows, setRows] = useState<GiftRow[]>([])
  const load = useCallback(() => { supabase.from('gift_log').select('id,from_id,to_id,item_code,note,created_at').order('created_at', { ascending: false }).limit(limit).then(r => { if (!r.error) setRows((r.data ?? []) as GiftRow[]) }) }, [limit])
  useEffect(() => { if (!enabled) return; load(); const ch = supabase.channel('gift-log-feed-' + Math.random().toString(36).slice(2)).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gift_log' }, load).subscribe(); return () => { supabase.removeChannel(ch) } }, [load, enabled])
  return rows
}
/** "Gift to everyone" creates one row per member with the same time: show it as ONE entry. */
export const groupGifts = (rows: GiftRow[]): (GiftRow & { n: number })[] => { const m = new Map<string, GiftRow & { n: number }>(); rows.forEach(g => { const k = g.from_id + '|' + g.item_code + '|' + g.created_at; const x = m.get(k); if (x) x.n++; else m.set(k, { ...g, n: 1 }) }); return [...m.values()] }
export const giftTitle = (code: string, extra?: Map<string, Item>) => code === BUNDLE ? 'Every premium style' : code === EVERYONE ? 'A gift for everyone' : itemOf(code, extra)?.name ?? 'a style'
export const giftWhen = (iso: string) => { const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago' }

const confetti = (n: number) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2 + Math.random() * 0.4; const d = 90 + Math.random() * 130
  return { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, r: Math.random() * 720 - 360, c: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#c084fc', '#f87171'][i % 6], w: 6 + Math.random() * 6, dl: Math.random() * 0.25 }
})

/** The receiver's animation: the box shakes, bursts open, confetti flies and the gift appears. */
function GiftReveal({ g, from, onClose }: { g: GiftRow; from: string; onClose: () => void }) {
  const nav = useNavigate(); const custom = useCustomItems(); const it = itemOf(g.item_code, custom)
  const bits = useMemo(() => confetti(perfTier() === 'low' ? 16 : 34), [g.id])
  const bundle = g.item_code === BUNDLE; const col = it ? RARITY[it.rarity].color : '#fbbf24'
  useEffect(() => { const t = window.setTimeout(() => { try { navigator.vibrate?.([40, 30, 90]) } catch { /* not supported */ } }, 1300); return () => window.clearTimeout(t) }, [])
  return createPortal(
    <div className="gift-bg" style={{ '--rc': col } as CSSProperties} role="dialog" aria-modal="true" aria-label="You received a gift" onClick={onClose}>
      <div className="gift-rays" aria-hidden="true" />
      <div className="gift-stage" onClick={e => e.stopPropagation()}>
        <div className="gx" aria-hidden="true">
          <i className="gx-glow" /><i className="gx-ring" /><i className="gx-ring r2" />
          <div className="gx-box"><div className="gx-lid"><b /></div><div className="gx-body" /></div>
          {Array.from({ length: 10 }, (_, i) => <i key={i} className="gx-star" style={{ '--a': i * 36 + 'deg', '--d': 70 + (i % 3) * 26 + 'px' } as CSSProperties} />)}
        </div>
        <div className="gift-conf" aria-hidden="true">{bits.map((b, i) => <i key={i} style={{ '--x': b.x + 'px', '--y': b.y + 'px', '--r': b.r + 'deg', background: b.c, width: b.w, height: b.w * 0.5, animationDelay: 1.3 + b.dl + 's' } as CSSProperties} />)}</div>
        <div className="gift-card">
          <p className="gift-from">A gift from <b>{from}</b></p>
          <div className="gift-item">{bundle ? <span className="gift-crown">👑</span> : it ? <ItemPreview item={it} play /> : <span className="gift-crown">✨</span>}</div>
          <h2>{giftTitle(g.item_code, custom)}</h2>
          {it && <Rarity r={it.rarity} />}
          {g.note && <p className="gift-note">“{g.note}”</p>}
          <div className="flex gap-2 justify-center flex-wrap mt-3"><button className="sym-btn ok" onClick={() => { onClose(); nav('/style') }}>✨ Wear it now</button><button className="sym-btn" onClick={onClose}>Close</button></div>
        </div>
      </div>
    </div>, document.body)
}

/** The sender's animation: the gift flies away with sparkles. */
function GiftSent({ s, onClose }: { s: Sent; onClose: () => void }) {
  const custom = useCustomItems(); useEffect(() => { const t = window.setTimeout(onClose, 3200); return () => window.clearTimeout(t) }, [onClose])
  const it = itemOf(s.itemCode, custom); const col = it ? RARITY[it.rarity].color : '#fbbf24'
  return createPortal(
    <div className="gsent-bg" role="status" aria-live="polite" onClick={onClose}>
      <div className="gsent" style={{ '--rc': col } as CSSProperties}>
        <div className="gsent-fly" aria-hidden="true"><span>🎁</span>{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</div>
        <div className="gsent-ok" aria-hidden="true">✓</div>
        <h3>Gift sent!</h3>
        <p><b>{giftTitle(s.itemCode, custom)}</b> {s.many ? `went to ${s.many} members` : <>is on its way to <b>{s.toName}</b></>}</p>
      </div>
    </div>, document.body)
}

/** Mounted once in App. Shows the sender's animation and the receiver's unwrap animation (also for gifts that arrived while you were away). */
export function GiftHost() {
  const { session } = useAuth(); const uid = session?.user.id
  const [queue, setQueue] = useState<GiftRow[]>([]); const [names, setNames] = useState<Record<string, string>>({}); const [sent, setSent] = useState<Sent | null>(null)
  const enqueue = useCallback((rows: GiftRow[]) => { setQueue(q => { const have = new Set(q.map(x => x.id)); return [...q, ...rows.filter(r => !have.has(r.id))] }) }, [])
  useEffect(() => { const f = (e: Event) => setSent((e as CustomEvent<Sent>).detail); window.addEventListener('sym-gift-sent', f); return () => window.removeEventListener('sym-gift-sent', f) }, [])
  useEffect(() => {
    if (!uid) { setQueue([]); return }
    supabase.from('gift_log').select('id,from_id,to_id,item_code,note,created_at,seen').eq('to_id', uid).eq('seen', false).order('created_at').limit(5).then(r => { if (!r.error) enqueue((r.data ?? []) as GiftRow[]) })
    const ch = supabase.channel('gift-me-' + uid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gift_log', filter: 'to_id=eq.' + uid }, (p: any) => { if (p.new?.id) enqueue([p.new as GiftRow]) }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [uid, enqueue])
  const cur = queue[0]
  useEffect(() => { if (!cur || names[cur.from_id]) return; supabase.from('profiles').select('id,username,display_name').eq('id', cur.from_id).maybeSingle().then(r => setNames(n => ({ ...n, [cur.from_id]: r.data?.display_name || r.data?.username || 'the admins' }))) }, [cur, names])
  const done = () => { if (!cur) return; supabase.from('gift_log').update({ seen: true }).eq('id', cur.id).then(() => {}); setQueue(q => q.slice(1)) }
  return <>{sent && <GiftSent s={sent} onClose={() => setSent(null)} />}{cur && !sent && <GiftReveal key={cur.id} g={cur} from={names[cur.from_id] ?? '…'} onClose={done} />}</>
}
