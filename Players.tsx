import { ProfileActions } from './ProfileSocial'
import { ProfileMenu } from './ProfileMenu'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Equip, flex, itemOf, normEquip } from './styleCatalog'
import { primeStyles, useCustomItems } from './styleStore'
import { PlayerLite, ProfileCard } from './StyleKit'
import { GiftRow, giftTitle, giftWhen, groupGifts, useGiftLog } from './Gifts'

type Player = PlayerLite & { style: Partial<Equip>; owned: string[] }

// Every player's look, side by side. Tap a card to see everything they have equipped and collected.
export function Players() {
  const [rows, setRows] = useState<Player[] | null>(null); const [err, setErr] = useState(''); const [q, setQ] = useState(''); const [sort, setSort] = useState('style'); const [only, setOnly] = useState('all'); const [open, setOpen] = useState<string | null>(null); const [lim, setLim] = useState(24)
  useEffect(() => { setLim(24) }, [q, sort, only])
  const custom = useCustomItems(); const gifts = useGiftLog(250)
  useEffect(() => { supabase.rpc('style_players').then(r => { if (r.error) setErr(r.error.message + ' — an admin needs to run SYMBIOTES_PHASE6_STYLE.sql in Supabase.'); else { const l = (r.data ?? []) as Player[]; setRows(l); primeStyles(l) } }) }, [])
  const list = useMemo(() => {
    const eq = (p: Player) => normEquip(p.style)
    const gold = (p: Player) => { const e = eq(p); return e.card === 'cd_gold' || ['fr_imperial', 'fr_royal_crown'].includes(e.frame) || ['nm_gold', 'nm_royal'].includes(e.namefx) || e.backdrop === 'bd_gold' }
    const video = (p: Player) => { const e = eq(p); return (e.backdrop === 'bd_myvideo' && !!e.bg_media && e.bg_kind !== 'image') || itemOf(e.backdrop, custom)?.kind === 'video' }
    return (rows ?? []).filter(p => (p.username + (p.display_name ?? '') + (p.ff_ign ?? '')).toLowerCase().includes(q.toLowerCase()) && (only === 'all' || (only === 'gold' && gold(p)) || (only === 'video' && video(p))))
      .sort((a, b) => sort === 'name' ? (a.display_name || a.username).localeCompare(b.display_name || b.username) : sort === 'rank' ? (a.rank ?? 9999) - (b.rank ?? 9999) : flex(eq(b), custom) - flex(eq(a), custom) || (a.rank ?? 9999) - (b.rank ?? 9999))
  }, [rows, q, sort, only, custom])
  const feed = useMemo(() => groupGifts(gifts), [gifts])
  const idx = open ? list.findIndex(p => p.id === open) : -1
  const nameOf = useMemo(() => { const m = new Map((rows ?? []).map(p => [p.id, p.display_name || p.username])); return (id: string) => m.get(id) ?? 'the admins' }, [rows])
  return (
    <div className="space-y-4">
      <div><h1 className="h1">Players</h1><p className="text-sm text-gray-400">Every member's profile style. Videos play right on the cards. Tap a card to inspect everything they have equipped and gifts.</p></div>
      {!!feed.length && <div className="gift-feed" aria-label="Recent gifts"><b>🎁 Recent gifts</b><div className="gift-feed-row">{feed.slice(0, 12).map(g => <button key={g.id} className="gift-chip" onClick={() => { if (g.n === 1 && rows?.some(p => p.id === g.to_id)) setOpen(g.to_id) }}><span><b>{nameOf(g.from_id)}</b> → <b>{g.n > 1 ? `everyone (${g.n})` : nameOf(g.to_id)}</b></span><small>{giftTitle(g.item_code, custom)} · {giftWhen(g.created_at)}</small></button>)}</div></div>}
      <div className="toolbar"><input className="sym-inp !mb-0" placeholder="🔍 Find a player" value={q} onChange={e => setQ(e.target.value)} aria-label="Find a player" />
        <select className="sym-inp !mb-0" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort"><option value="style">Fanciest first</option><option value="rank">Best rank</option><option value="name">Name A–Z</option></select>
        <select className="sym-inp !mb-0" value={only} onChange={e => setOnly(e.target.value)} aria-label="Filter"><option value="all">Everyone</option><option value="gold">Golden looks</option><option value="video">Video backdrops</option></select></div>
      {err && <p className="glass p-3 text-amber-300 text-sm" role="alert">{err}</p>}
      {!rows && !err && <p className="text-center text-gray-400 animate-pulse">Loading players…</p>}
      <div className="players">{list.slice(0, lim).map(p => <ProfileCard key={p.id} p={p} equip={normEquip(p.style)} onClick={() => setOpen(p.id)} />)}</div>
      {list.length > lim && <button className="sym-btn mx-auto block" onClick={() => setLim(l => l + 24)}>Show more players ({list.length - lim} left)</button>}
      {rows && !list.length && <p className="text-center text-gray-400 text-sm">No players match.</p>}
      {idx >= 0 && <PlayerSheet list={list} index={idx} gifts={gifts} nameOf={nameOf} onIndex={i => setOpen(list[i].id)} onClose={() => setOpen(null)} />}
    </div>)
}

function PlayerSheet({ list, index, onIndex, onClose, gifts, nameOf }: { list: Player[]; index: number; onIndex: (i: number) => void; onClose: () => void; gifts: GiftRow[]; nameOf: (id: string) => string }) {
  const { session } = useAuth(); const nav = useNavigate(); const custom = useCustomItems(); const p = list[index]; const e = normEquip(p.style); const [x0, setX0] = useState<number | null>(null)
  const go = (d: number) => onIndex((index + d + list.length) % list.length)
  useEffect(() => {
    const k = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); if (ev.key === 'ArrowRight') go(1); if (ev.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  })
  const dm = async () => { const r = await supabase.rpc('get_or_create_dm', { other: p.id }); if (!r.error) nav('/chat?c=' + r.data) }
  const name = p.display_name || p.username
  // rendered on <body>: the page's route animation would otherwise trap a fixed overlay and push the sheet off screen
  return createPortal(
    <div className="sheet-bg" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`${name}'s profile style`} onClick={ev => ev.stopPropagation()}
        onTouchStart={ev => setX0(ev.touches[0].clientX)} onTouchEnd={ev => { if (x0 !== null && Math.abs(ev.changedTouches[0].clientX - x0) > 70) go(ev.changedTouches[0].clientX < x0 ? 1 : -1); setX0(null) }}>
        <div className="sheet-bar"><button className="icon-btn" onClick={() => go(-1)} aria-label="Previous player">‹</button><span className="text-xs text-gray-400">{index + 1} / {list.length}</span><button className="icon-btn" onClick={() => go(1)} aria-label="Next player">›</button><span className="ml-auto" /><ProfileMenu id={p.id} name={name} equip={e} owned={p.owned} gifts={gifts} nameOf={nameOf} /><button className="icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
        <ProfileCard key={p.id} p={p} equip={e} size="lg" play>
          <div className="flex gap-2 flex-wrap mt-3"><Link to={`/u/${p.username}`} className="sym-btn" onClick={onClose}>Open profile</Link>{p.id !== session?.user.id && <button className="sym-btn" onClick={dm}>💬 Message</button>}</div>
          <ProfileActions target={p} />
        </ProfileCard>
      </div>
    </div>, document.body)
}
