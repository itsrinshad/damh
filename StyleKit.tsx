// Drawing pieces for profile styles: framed avatar, styled name, title pill, backdrop (image / video / CSS), aura and the profile card.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as KE, type ReactNode } from 'react'
import { DEFAULT_EQUIP, Equip, Item, RARITY, itemOf, nameOfTitle } from './styleCatalog'
import { useCustomItems, useEquip } from './styleStore'
import { perfTier, saveData } from './prefs'
import { TPL, cleanFx, hexRgb, isHex } from './templates'
import './templates.css'
import { LiveBg } from './LiveBg'

const v = (o: Record<string, string | number>) => o as CSSProperties

const reduced = () => { try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches } catch { return false } }
/** Looping muted video that really plays on phones: sets the muted flag before play(), starts only while on screen,
 *  restarts after a stall or when the tab returns, falls back to the still picture if the file cannot be decoded,
 *  and shows a "Tap to play" button when the phone blocks autoplay (or Data Saver is on). */
function BgVideo({ src, poster, className }: { src: string; poster?: string | null; className: string }) {
  const ref = useRef<HTMLVideoElement>(null); const [bad, setBad] = useState(false); const [blocked, setBlocked] = useState(saveData())
  useEffect(() => {
    const v = ref.current; if (!v) return
    v.muted = true; v.defaultMuted = true; v.loop = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '')
    let stall = 0; let on = true; const hold = saveData()
    const play = () => { if (!on || document.hidden || hold) return; const p = v.play(); if (p && typeof p.then === 'function') p.then(() => setBlocked(false)).catch(() => setBlocked(true)) }
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) play(); else v.pause() }, { threshold: 0.1 }); io.observe(v)
    const waiting = () => { window.clearTimeout(stall); stall = window.setTimeout(() => { if (v.readyState < 3 && on) { v.load(); play(); stall = window.setTimeout(() => { if (v.readyState < 3) setBad(true) }, 7000) } }, 5000) }
    const ok = () => { window.clearTimeout(stall); setBlocked(false) }
    const vis = () => { if (!document.hidden) play() }
    const kick = () => { if (v.paused) play() }
    const onPause = () => { if (on && !document.hidden && !v.ended && !hold) window.setTimeout(play, 400) }
    v.addEventListener('canplay', play); v.addEventListener('loadeddata', play); v.addEventListener('waiting', waiting); v.addEventListener('stalled', waiting); v.addEventListener('playing', ok); v.addEventListener('pause', onPause)
    document.addEventListener('visibilitychange', vis); window.addEventListener('touchstart', kick, { passive: true }); window.addEventListener('pointerdown', kick, { passive: true })
    play()
    return () => { io.disconnect(); window.clearTimeout(stall); v.removeEventListener('pause', onPause); document.removeEventListener('visibilitychange', vis); window.removeEventListener('touchstart', kick); window.removeEventListener('pointerdown', kick) }
  }, [src])
  if (bad) return poster ? <img className={className} src={poster} alt="" /> : <div className="bd-css bd_night" />
  return <>
    <video ref={ref} className={className} src={src} poster={poster ?? undefined} autoPlay muted loop playsInline preload={saveData() ? 'none' : perfTier() === 'low' ? 'metadata' : 'auto'} disablePictureInPicture onError={() => setBad(true)} />
    {blocked && <button type="button" className="bd-play" onClick={e => { e.stopPropagation(); const v = ref.current; if (v) { v.muted = true; v.play().then(() => setBlocked(false)).catch(() => { /* still blocked */ }) } }}>▶ Tap to play</button>}
  </>
}

export function StyledAvatar({ uid, url, name, size = 44, equip, onClick, className = '' }: { uid?: string | null; url?: string | null; name?: string | null; size?: number; equip?: Equip; onClick?: () => void; className?: string }) {
  const own = useEquip(uid); const e = equip ?? own; const f = e.fx ? cleanFx(e.fx) : null
  const customItems = useCustomItems(); const art = size >= 40 ? (() => { const it = itemOf(e.frame, customItems); return it?.img ? (it.img.includes('.') ? it.img : it.img + '.webp') : it?.slot === 'frame' ? it.media ?? undefined : undefined })() : undefined   // artwork rings need room; tiny avatars keep a plain coloured ring
  const pos: Record<string, string | number> = f ? { '--avx': (f.avX ?? 50) + '%', '--avy': (f.avY ?? 50) + '%', '--avz': f.avZ ?? 1, '--frz': f.frZ ?? 1 } : {}
  return (
    <span className={'fr ' + e.frame + (art ? ' fr-img' : '') + ' ' + className} style={v({ width: size, height: size, '--s': size + 'px', cursor: onClick ? 'pointer' : 'default', ...pos })} onClick={onClick}>
      {art && <img className="fr-art" src={art} alt="" loading="lazy" decoding="async" aria-hidden="true" />}
      <span className="fr-in">{url ? <img src={url} alt="" width={size} height={size} loading="lazy" /> : <b style={{ fontSize: size * 0.42 }}>{(name || '?').slice(0, 1).toUpperCase()}</b>}</span>
    </span>)
}
/** URL of the artwork ring a member wears (undefined for plain rings). Used for live "with your frame" previews. */
export function useFrameArt(uid?: string | null): string | undefined {
  const e = useEquip(uid); const custom = useCustomItems(); const it = itemOf(e.frame, custom)
  return it?.img ? (it.img.includes('.') ? it.img : it.img + '.webp') : it?.slot === 'frame' ? it.media ?? undefined : undefined
}
export function StyledName({ uid, name, equip, className = '' }: { uid?: string | null; name: string; equip?: Equip; className?: string }) {
  const own = useEquip(uid); const e = equip ?? own
  return <span className={'nm ' + e.namefx + ' ' + className}>{name}</span>
}
export function TitlePill({ code }: { code: string }) {
  const custom = useCustomItems(); const t = nameOfTitle(code, custom); if (!t) return null
  const it = itemOf(code, custom)
  return <span className="tt" style={v({ '--rc': RARITY[it?.rarity ?? 'common'].color })}>{t}</span>
}
export const Rarity = ({ r }: { r: Item['rarity'] }) => <span className="rar" style={v({ '--rc': RARITY[r].color })}>{RARITY[r].label}</span>

/** Video on a LIST card (Players grid): plays muted while the card is on screen. At most a few play at once (1 on weak phones)
 *  so a page full of players stays smooth; the rest show their still picture and take over a free slot when you scroll. */
const slots = new Set<symbol>()
const maxSlots = () => (perfTier() === 'low' ? 1 : 3)
function ListVid({ src, poster, className, still }: { src: string; poster?: string | null; className: string; still: ReactNode }) {
  const box = useRef<HTMLSpanElement>(null); const [live, setLive] = useState(false)
  useEffect(() => {
    const el = box.current; if (!el || saveData()) return
    const id = Symbol(); let seen = false
    const sync = () => {
      if (seen && !slots.has(id) && slots.size < maxSlots()) { slots.add(id); setLive(true) }
      else if (!seen && slots.has(id)) { slots.delete(id); setLive(false); window.dispatchEvent(new Event('sym-vslot')) }
    }
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync() }, { rootMargin: '60px' }); io.observe(el)
    window.addEventListener('sym-vslot', sync)
    return () => { io.disconnect(); window.removeEventListener('sym-vslot', sync); if (slots.delete(id)) window.dispatchEvent(new Event('sym-vslot')) }
  }, [])
  return <span ref={box} className="vid-slot">{live ? <BgVideo src={src} poster={poster} className={className} /> : still}</span>
}

/** Backdrop behind a profile card: the whole card is the canvas. VIDEO backdrops only play when `play` is true (profile page, inspect sheet, studio);
 *  in lists they show their first frame so a page full of players stays light. Picture backdrops are no longer offered. */
export function Backdrop({ code, play, media, poster, kind }: { code: string; play?: boolean; big?: boolean; media?: string | null; poster?: string | null; kind?: string | null }) {
  const custom = useCustomItems(); const it = itemOf(code, custom)
  const still = (src?: string | null, cls = 'bd-vid') => src ? <img className={cls} src={src} alt="" loading="lazy" decoding="async" /> : null
  // no poster saved? show the clip's first frame (metadata only, never plays) so list cards are not an empty black box
  const frame = (src: string, cls: string) => <video className={cls} src={src + '#t=0.1'} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" />
  if (code.startsWith('bd_live_')) return <LiveBg theme={code.slice(8)} play={!!play} />
  if (code === 'bd_myvideo') {   // the member's own uploaded video
    if (!media || kind === 'image') return still(kind === 'image' ? media : poster) ?? <div className="bd-css bd_myvideo" />
    if (reduced()) return still(poster) ?? frame(media, 'bd-vid')
    if (!play) return <ListVid src={media} poster={poster} className="bd-vid" still={still(poster) ?? frame(media, 'bd-vid')} />
    return <BgVideo src={media} poster={poster} className="bd-vid" />
  }
  if (it?.custom && it.media) {
    if (it.kind === 'video') {
      if (reduced()) return still(it.poster, 'bd-media') ?? frame(it.media, 'bd-media')
      if (!play) return <ListVid src={it.media} poster={it.poster} className="bd-media" still={still(it.poster, 'bd-media') ?? frame(it.media, 'bd-media')} />
      return <BgVideo src={it.media} poster={it.poster} className="bd-media" />
    }
    return still(it.media, 'bd-media')
  }
  if (it?.img) return <img className="bd-media" src={it.img + '.jpg'} alt="" loading="lazy" decoding="async" />
  return <div className={'bd-css ' + (it && code !== 'bd_myimage' ? code : 'bd_night')} />
}
export function Aura({ code }: { code: string }) {
  if (!code || code === 'au_none') return null
  const n = perfTier() === 'low' ? 7 : 14   // weak phones still get the full effect, with fewer particles
  return <div className={'aura ' + code} aria-hidden="true">{code === 'au_violet' ? null : Array.from({ length: n }, (_, i) => <i key={i} style={v({ '--i': i * (14 / n) })} />)}</div>
}

export type PlayerLite = { id: string; username: string; display_name?: string | null; avatar_url?: string | null; role?: string; ff_ign?: string | null; ff_rank?: string | null; player_level?: number | null; bio?: string | null; glory?: number | null; rank?: number | null; badges?: number | null }

// One shared observer pauses every CSS animation of a card that is scrolled out of view (big saving on weak phones)
let sharedIO: IntersectionObserver | null = null
const watch = (el: Element) => {
  if (typeof IntersectionObserver === 'undefined') return () => {}
  if (!sharedIO) sharedIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('pc-off', !e.isIntersecting)), { rootMargin: '160px' })
  sharedIO.observe(el); return () => { sharedIO?.unobserve(el) }
}

/** The profile card. The backdrop (video or CSS art) fills the WHOLE card. size "sm" is used in the Players grid, "lg" on the profile page, in the studio preview and in the player sheet. */
export function ProfileCard({ p, equip, size = 'sm', play = false, children, onClick }: { p: PlayerLite; equip: Equip; size?: 'sm' | 'lg'; play?: boolean; children?: ReactNode; onClick?: () => void }) {
  const name = p.display_name || p.username; const custom = useCustomItems(); const root = useRef<HTMLElement>(null)
  const stored = useEquip(p.id)   // template fields come from the live store when the caller's data does not carry them
  const E: Equip = { ...equip, template: equip.template !== undefined ? equip.template : stored.template, accent: equip.accent !== undefined ? equip.accent : stored.accent, fx: equip.fx !== undefined ? equip.fx : stored.fx }
  const tpl = E.template && TPL[E.template] ? E.template : null; const fx = cleanFx(E.fx); const accent = isHex(E.accent) ? E.accent : null
  useEffect(() => { const el = root.current; return el ? watch(el) : undefined }, [])
  const click = onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (e: KE) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }, 'aria-label': `Open ${name}` } : {}
  const isVideo = (equip.backdrop === 'bd_myvideo' && !!equip.bg_media && equip.bg_kind !== 'image') || itemOf(equip.backdrop, custom)?.kind === 'video'
  const hasMedia = isVideo || !!itemOf(equip.backdrop, custom)?.media || (equip.backdrop === 'bd_myvideo' && !!equip.bg_media)
  const st: Record<string, string | number> = {}
  if (tpl) { st['--bgx'] = (fx.bgX ?? 50) + '%'; st['--bgy'] = (fx.bgY ?? 50) + '%'; st['--bgz'] = fx.bgZ ?? 1 }
  if (accent) { st['--pa'] = accent; st['--par'] = hexRgb(accent) }
  if (fx.nameColor) st['--nc'] = fx.nameColor
  const cls = `pc pc-${size} ${equip.card}${onClick ? ' pc-tap' : ''}${isVideo ? ' pc-hasvid' : ''}${fx.on === false ? ' fx-off' : ''}${fx.anim && fx.anim !== 'none' ? ' fxa-' + fx.anim : ''}${fx.font && fx.font !== 'sans' ? ' nmf-' + fx.font : ''}`
  return (
    <article ref={root} className={cls} style={v(st)} data-tpl={tpl ?? undefined} data-nc={fx.nameColor ? '1' : undefined} {...click}>
      <div className="pc-ban">{tpl && !hasMedia ? <div className="tpl-art" /> : <Backdrop code={equip.backdrop} play={play} big={size === 'lg'} media={equip.bg_media} poster={equip.bg_poster} kind={equip.bg_kind} />}<div className="pc-shade" /><Aura code={equip.aura} /></div>
      {isVideo && !play && <span className="pc-vid" aria-hidden="true">▶ video</span>}
      <div className="pc-body">
        <StyledAvatar uid={p.id} url={p.avatar_url} name={name} size={size === 'lg' ? 96 : 68} equip={E} />
        <div className="pc-id">
          <StyledName name={name} equip={E} className="pc-name" />
          <TitlePill code={equip.title} />
        </div>
        <small className="pc-user">@{p.username}{p.role && p.role !== 'member' ? ' · ' + p.role.replace('_', ' ') : ''}</small>
        {equip.status && <p className="pc-status">“{equip.status}”</p>}
        <dl className="pc-stats">
          <div><dt>Glory</dt><dd>{p.glory != null ? Number(p.glory).toLocaleString() : '—'}</dd></div>
          <div><dt>Rank</dt><dd>{p.rank ? '#' + p.rank : '—'}</dd></div>
          <div><dt>Badges</dt><dd>{p.badges ?? 0}</dd></div>
        </dl>
        {children}
      </div>
    </article>)
}

/** Small preview of one catalogue item (used in the studio, quests and collections). */
export function ItemPreview({ item, play }: { item: Item; play?: boolean }) {
  const base = { ...DEFAULT_EQUIP }
  switch (item.slot) {
    case 'frame': return <StyledAvatar size={40} name="S" equip={{ ...base, frame: item.code }} />
    case 'namefx': return <span className={'nm nm-big ' + item.code}>Symbiote</span>
    case 'backdrop': return <div className="tile-bd"><Backdrop code={item.code} play={play} /></div>
    case 'aura': return <div className="tile-au"><Aura code={item.code} /><i>✦</i></div>
    case 'card': return <div className={'tile-cd ' + item.code}><span /><span /></div>
    default: return <TitlePill code={item.code} />
  }
}
