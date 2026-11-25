// "⋯" menu on a profile: Wearing now · Gifts · Collection. Mobile = premium bottom sheet, desktop = dropdown.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './lib'
import { Equip, Item, SLOTS, itemOf, rarityRank } from './styleCatalog'
import { useCustomItems } from './styleStore'
import { ItemPreview, Rarity } from './StyleKit'
import { GiftRow, giftTitle, giftWhen, groupGifts, useGiftLog } from './Gifts'

let cache: { at: number; rows: Record<string, string[]> } | null = null
async function ownedOf(id: string): Promise<string[]> {
  if (!cache || Date.now() - cache.at > 30000) {
    const r = await supabase.rpc('style_players'); if (r.error) return []
    cache = { at: Date.now(), rows: Object.fromEntries(((r.data ?? []) as { id: string; owned?: string[] }[]).map(x => [x.id, x.owned ?? []])) }
  }
  return cache.rows[id] ?? []
}
const useMobile = () => { const [m, set] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(max-width:767px)').matches); useEffect(() => { const q = matchMedia('(max-width:767px)'); const f = () => set(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f) }, []); return m }

type Tab = 'wear' | 'gifts' | 'coll'
export function ProfileMenu({ id, name, equip, owned, gifts, nameOf }: { id: string; name: string; equip: Equip; owned?: string[]; gifts?: GiftRow[]; nameOf?: (id: string) => string }) {
  const [open, setOpen] = useState(false); const [tab, setTab] = useState<Tab>('wear'); const mobile = useMobile(); const btn = useRef<HTMLButtonElement>(null)
  const custom = useCustomItems(); const [fetched, setFetched] = useState<string[] | null>(null)
  const own = useGiftLog(250, open && !gifts); const log = gifts ?? own
  const [names, setNames] = useState<Record<string, string>>({})
  useEffect(() => { if (!open) return; if (!owned) ownedOf(id).then(setFetched); if (!nameOf) supabase.from('profiles').select('id,username,display_name').then(r => setNames(Object.fromEntries((r.data ?? []).map((p: any) => [p.id, p.display_name || p.username])))) }, [open, id, owned, nameOf])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }; window.addEventListener('keydown', k)
    const prev = document.body.style.overflow; if (mobile) document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [open, mobile])
  const who = nameOf ?? ((x: string) => names[x] ?? 'the admins')
  const wearing = SLOTS.map(s => ({ s, it: itemOf(equip[s.id], custom) }))
  // what they wear is always theirs, even if the ownership list is empty (admin / King grants)
  const coll = useMemo(() => {
    const m = new Map<string, Item>()
    ;(owned ?? fetched ?? []).forEach(c => { const i = itemOf(c, custom); if (i) m.set(i.code, i) })
    wearing.forEach(({ it }) => { if (it && !it.free) m.set(it.code, it) })
    return [...m.values()]
  }, [owned, fetched, custom, equip])
  const got = log.filter(g => g.to_id === id); const gave = groupGifts(log.filter(g => g.from_id === id))
  const feed = [...got.map(g => ({ g, inb: true, n: 1 })), ...gave.map(g => ({ g, inb: false, n: g.n }))].sort((a, b) => +new Date(b.g.created_at) - +new Date(a.g.created_at)).slice(0, 20)
  const body = <>
    <div className="seg pm-seg" role="tablist" aria-label="Profile details">{([['wear', 'Wearing now'], ['gifts', 'Gifts'], ['coll', 'Collection']] as [Tab, string][]).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div className="pm-body">
      {tab === 'wear' && <ul className="wear">{wearing.map(({ s, it }) => <li key={s.id}><span className="text-xs text-gray-400">{s.label}</span><b className="truncate">{it?.name ?? '—'}</b>{it && !it.free && <Rarity r={it.rarity} />}</li>)}</ul>}
      {tab === 'gifts' && (!feed.length ? <p className="text-sm text-gray-400">No gifts yet.</p> : <><p className="text-xs text-gray-400 mb-2">{got.length} received{gave.length ? ` · ${gave.length} given` : ''}</p><ul className="gift-list">{feed.map(({ g, inb, n }) => <li key={g.id + (inb ? 'i' : 'o')}><span aria-hidden="true">{inb ? '🎁' : '📤'}</span><div className="min-w-0"><b className="truncate block">{giftTitle(g.item_code, custom)}</b><small className="text-gray-400">{inb ? 'from ' + who(g.from_id) : 'to ' + (n > 1 ? `everyone (${n})` : who(g.to_id))} · {giftWhen(g.created_at)}</small>{g.note && <small className="block text-gray-300 italic">“{g.note}”</small>}</div></li>)}</ul></>)}
      {tab === 'coll' && (!coll.length ? <p className="text-sm text-gray-400">Nothing collected yet. Quests and admin gifts unlock styles.</p> : <><p className="text-xs text-gray-400 mb-2">{coll.length} collected</p>{SLOTS.map(s => { const l = coll.filter(i => i.slot === s.id).sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity)); return l.length ? <div key={s.id} className="mb-3"><p className="text-xs text-gray-400 mb-1">{s.label}</p><div className="mini-tiles">{l.map(i => <div key={i.code} className={'mini' + (equip[s.id] === i.code ? ' pm-on' : '')} title={i.name}><span className="mini-pv"><ItemPreview item={i} /></span><small className="truncate">{i.name}</small><Rarity r={i.rarity} /></div>)}</div></div> : null })}</>)}
    </div>
  </>
  const close = () => { setOpen(false); btn.current?.focus() }
  return <>
    <button ref={btn} type="button" className="icon-btn pm-btn" aria-haspopup="dialog" aria-expanded={open} aria-label={`More about ${name}`} onClick={() => setOpen(o => !o)}>⋯</button>
    {open && (mobile
      ? createPortal(<div className="pm-bg" onClick={close} role="presentation"><div className="pm-sheet" role="dialog" aria-modal="true" aria-label={`${name}: details`} onClick={e => e.stopPropagation()}><div className="pm-grab" aria-hidden="true" /><div className="pm-head"><b className="truncate">{name}</b><button className="icon-btn" onClick={close} aria-label="Close">✕</button></div>{body}</div></div>, document.body)
      : <><div className="pm-scrim" onClick={close} role="presentation" /><div className="pm-drop" role="dialog" aria-label={`${name}: details`}>{body}</div></>)}
  </>
}
