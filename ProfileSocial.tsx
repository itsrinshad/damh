// Like / Follow buttons with live counts + Instagram / WhatsApp icons, drawn inside the profile card.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './lib'
import { useAuth } from './auth'
import { IgIcon, WaIcon, igLink, waLink } from './ui'

type Social = { likes: number; liked: boolean; followers: number; following: boolean }
const kfmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n)

export function ProfileActions({ target }: { target: { id: string; username: string; whatsapp?: string | null; instagram?: string | null } }) {
  const { session } = useAuth(); const me = session?.user.id; const mine = me === target.id
  const [s, setS] = useState<Social | null>(null); const [busy, setBusy] = useState(''); const [err, setErr] = useState('')
  const [links, setLinks] = useState({ wa: target.whatsapp, ig: target.instagram }); const timer = useRef(0)
  const load = useCallback(() => { supabase.rpc('profile_social', { p_target: target.id }).then(r => { if (!r.error && r.data) setS(r.data as Social) }) }, [target.id])
  useEffect(() => { setS(null); setErr(''); load() }, [load])
  // live like / follow counts (re-read at most once a second so a burst of likes is one request)
  useEffect(() => {
    const again = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(load, 800) }
    const ch = supabase.channel('social-' + target.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_likes', filter: 'target_id=eq.' + target.id }, again)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_follows', filter: 'target_id=eq.' + target.id }, again).subscribe()
    return () => { window.clearTimeout(timer.current); supabase.removeChannel(ch) }
  }, [target.id, load])
  useEffect(() => {   // lists do not carry the social links; read them once when missing
    if (target.whatsapp !== undefined || target.instagram !== undefined) { setLinks({ wa: target.whatsapp, ig: target.instagram }); return }
    supabase.from('profiles').select('whatsapp,instagram').eq('id', target.id).maybeSingle().then(r => setLinks({ wa: r.data?.whatsapp, ig: r.data?.instagram }))
  }, [target.id, target.whatsapp, target.instagram])

  const toggle = async (fn: 'profile_like_toggle' | 'profile_follow_toggle') => {
    if (!s || busy) return; setBusy(fn); setErr('')
    const prev = s   // optimistic update, rolled back if the server says no
    setS(fn === 'profile_like_toggle' ? { ...s, liked: !s.liked, likes: s.likes + (s.liked ? -1 : 1) } : { ...s, following: !s.following, followers: s.followers + (s.following ? -1 : 1) })
    const r = await supabase.rpc(fn, { p_target: target.id }); setBusy('')
    if (r.error) { setS(prev); setErr(r.error.message) } else setS(r.data as Social)
  }
  const wa = waLink(links.wa); const ig = igLink(links.ig)
  return (
    <div className="w-full" onClick={e => e.stopPropagation()}>
      <div className="pa-row">
        <button type="button" className={'pa-btn' + (s?.liked ? ' on' : '')} disabled={mine || !s || !!busy} onClick={() => toggle('profile_like_toggle')} aria-pressed={!!s?.liked} aria-label="Like profile">
          <span className="pa-heart">{s?.liked ? '💖' : '🤍'}</span>{s ? kfmt(s.likes) : '…'} {mine ? 'Likes' : 'Like'}
        </button>
        {!mine && <button type="button" className={'pa-btn' + (s?.following ? ' on' : '')} disabled={!s || !!busy} onClick={() => toggle('profile_follow_toggle')} aria-pressed={!!s?.following}>{s?.following ? 'Following' : 'Follow'}</button>}
        {mine && s && <button type="button" className="pa-btn" disabled>{kfmt(s.followers)} Followers</button>}
      </div>
      {!mine && s && s.followers > 0 && <p className="text-[11px] mt-1 opacity-70">{kfmt(s.followers)} follower{s.followers === 1 ? '' : 's'}</p>}
      {(wa || ig) && <div className="pa-soc">
        {ig && <a className="pa-ico" href={ig} target="_blank" rel="noreferrer noopener" aria-label="Instagram"><IgIcon /></a>}
        {wa && <a className="pa-ico" href={wa} target="_blank" rel="noreferrer noopener" aria-label="WhatsApp"><WaIcon /></a>}
      </div>}
      {err && <p className="text-amber-300 text-xs mt-2" role="alert">{err}{/does not exist|schema cache|function/i.test(err) ? ' (run SYMBIOTES_PHASE10.sql in Supabase)' : ''}</p>}
    </div>)
}
