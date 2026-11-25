// First-login welcome. Shown once per account, only to genuinely new players.
// "Seen" is stored on the account itself (auth user_metadata, no database migration) plus a local fallback, so it never repeats on any device.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'

const KEY = (uid: string) => 'sym-welcomed:' + uid
const localSeen = (uid: string) => { try { return localStorage.getItem(KEY(uid)) === '1' } catch { return false } }

export function NewPlayerWelcome() {
  const { session, profile } = useAuth(); const { pathname } = useLocation()
  const uid = session?.user.id; const active = profile?.status === 'active' && profile.id === uid
  const [show, setShow] = useState<string | null>(null)   // player name when visible
  const checked = useRef('')
  const btn = useRef<HTMLButtonElement>(null)

  const cur = useRef(uid); cur.current = uid
  useEffect(() => { setShow(null); checked.current = '' }, [uid])   // account switched or logged out: never carry the popup over
  useEffect(() => {
    if (!uid || !active || !session || checked.current === uid) return
    if (/^\/(login|admin-login)/.test(pathname)) return
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>
    if (meta.welcome_seen || localSeen(uid)) { checked.current = uid; return }
    checked.current = uid
    ;(async () => {
      // "new" = this is their first login (login_history is written by the existing login flow). If it cannot be read, fall back to account age.
      const h = await supabase.from('login_history').select('id', { count: 'exact', head: true }).eq('user_id', uid)
      const young = Date.now() - Date.parse(session.user.created_at) < 3 * 864e5
      const isNew = h.error ? young : (h.count ?? 0) <= 1 && young
      if (!isNew || cur.current !== uid) return
      const g = await supabase.from('profiles').select('ff_ign,display_name,username').eq('id', uid).maybeSingle()
      if (cur.current === uid) setShow((g.data?.ff_ign || g.data?.display_name || g.data?.username || profile?.display_name || profile?.username || 'Player') as string)
    })().catch(() => {})
  }, [uid, active, pathname])

  useEffect(() => {
    if (!show) return
    btn.current?.focus(); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') done() }; window.addEventListener('keydown', k)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k) }
  }, [show])

  const done = () => {
    if (!uid) return; setShow(null)
    try { localStorage.setItem(KEY(uid), '1') } catch { /* private mode: account flag below still applies */ }
    supabase.auth.updateUser({ data: { welcome_seen: true } }).then(() => {}, () => {})
  }
  if (!show) return null
  return (
    <div className="npw-bg" role="presentation">
      <div className="npw" role="dialog" aria-modal="true" aria-labelledby="npw-t" aria-describedby="npw-d">
        <svg className="npw-web" viewBox="0 0 400 400" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1">{[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => <line key={a} x1="200" y1="200" x2={200 + 260 * Math.cos(a * Math.PI / 180)} y2={200 + 260 * Math.sin(a * Math.PI / 180)} />)}{[40, 80, 120, 160, 200].map(r => <circle key={r} cx="200" cy="200" r={r} strokeDasharray="3 5" />)}</g></svg>
        <div className="npw-spider" aria-hidden="true"><i /><img src="/intro/spider.webp" alt="" width="88" height="88" decoding="async" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} /><span>🕷</span></div>
        <p className="npw-k">SYMBIOTES</p>
        <h2 id="npw-t" className="npw-n">{show}</h2>
        <p id="npw-d" className="npw-p"><b>Welcome to SYMBIOTES.</b> You’re officially part of the family. Explore, customize, connect and build your legacy.</p>
        <button ref={btn} className="npw-btn" onClick={done}>ENTER THE GUILD</button>
      </div>
    </div>)
}
