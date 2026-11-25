import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { getPrefs, setPrefs, usePrefs } from './prefs'
import { effectiveFx } from './siteFx'
import { pubUrl } from './Social'

const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => <button className={'sw' + (on ? ' on' : '')} onClick={() => set(!on)} aria-pressed={on} />

// Background music player (track chosen by the admin). Browsers only allow sound after a first tap.
export function BgMusic() {
  const p = usePrefs(); const [track, setTrack] = useState<{ path?: string; url?: string; enabled?: boolean; volume?: number } | null>(null); const a = useRef<HTMLAudioElement | null>(null)
  useEffect(() => { const ld = () => { supabase.from('site_settings').select('value').eq('key', 'bg_music').maybeSingle().then(r => setTrack(r.data?.value ?? null)) }; ld(); window.addEventListener('sym-music', ld); return () => window.removeEventListener('sym-music', ld) }, [])
  const url = track?.enabled ? (track.url || (track.path ? pubUrl(track.path) : '')) : ''; const master = track?.volume ?? 1
  useEffect(() => {
    if (!url) return
    const el = new Audio(url); el.loop = true; el.preload = 'none'; el.volume = getPrefs().vol * master; a.current = el
    // Music is ON by default. Browsers only allow sound after a tap, so try now and retry on the first tap/key.
    const start = () => { if (getPrefs().music && el.paused) el.play().catch(() => { /* waits for the first tap */ }) }
    start()
    const evs = ['pointerdown', 'touchstart', 'keydown']; evs.forEach(ev => document.addEventListener(ev, start, { once: true }))
    return () => { evs.forEach(ev => document.removeEventListener(ev, start)); el.pause(); a.current = null }
  }, [url])
  useEffect(() => { const el = a.current; if (!el) return; el.volume = p.vol * master; if (!p.music) el.pause(); else if (el.paused) el.play().catch(() => { /* needs a tap */ }) }, [p.music, p.vol, url, master])
  if (!url) return null
  return <button className={'music-btn' + (p.music ? '' : ' off')} aria-label="Music on/off" onClick={() => { const el = a.current; if (p.music) { el?.pause(); setPrefs({ music: false }) } else { setPrefs({ music: true }); el?.play().catch(() => { /* ignore */ }) } }}>{p.music ? '🎵' : '🔇'}</button>
}

export function Settings() {
  const p = usePrefs(); const { session, profile, isAdmin } = useAuth(); const nav = useNavigate()
  const [npw, setNpw] = useState(''); const [msg, setMsg] = useState('')
  const changePw = async () => { if (npw.length < 6) return setMsg('Password must be at least 6 characters.'); const { error } = await supabase.auth.updateUser({ password: npw }); setMsg(error ? error.message : 'Password changed ✅'); if (!error) setNpw('') }
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Settings</h2>
      <div className="glass p-4">
        <h3 className="font-semibold mb-1">🎨 Display</h3>
        <p className="text-xs text-gray-500">The site colours and moving background are set by the admins for everyone.</p>
        <div className="row mt-3"><span>Text size</span><span className="flex gap-2 items-center"><button className="sym-btn !px-3" onClick={() => setPrefs({ font: Math.max(14, p.font - 1) })}>A−</button><b>{p.font}</b><button className="sym-btn !px-3" onClick={() => setPrefs({ font: Math.min(20, p.font + 1) })}>A+</button></span></div>
        <div className="row"><span>Lite mode<small className="block text-gray-500">Turns off the moving site background. Profile effects still show in full.</small></span><Toggle on={p.lite} set={v => setPrefs({ lite: v })} /></div>
      </div>
      <div className="glass p-4">
        <h3 className="font-semibold mb-1">🎛 Colour &amp; effects</h3>
        <p className="text-xs text-gray-500">{p.own ? 'You set these for this device.' : 'Using the look the admins chose for everyone.'} Too bright? Tone it down. Saved on this device only.</p>
        <div className="flex gap-2 mt-3">{([['Soft', 40, 85, 95, 100], ['Normal', 65, 95, 105, 105], ['Vivid', 100, 100, 112, 115]] as const).map(([n, fx, bri, sat, con]) => <button key={n} className={'sym-btn flex-1' + (p.own && p.fx === fx && p.bri === bri && p.sat === sat && p.con === con ? '' : ' opacity-70')} onClick={() => setPrefs({ own: true, fx, bri, sat, con })}>{n}</button>)}</div>
        {([['fx', 'Glow strength', 0, 150], ['bri', 'Background brightness', 40, 130], ['sat', 'Colour saturation', 30, 150], ['con', 'Contrast', 70, 140]] as const).map(([k, label, lo, hi]) => { const eff = effectiveFx(); return <div className="row" key={k}><span>{label}<small className="block text-gray-500">{eff[k]}%</small></span><input type="range" min={lo} max={hi} step="5" value={eff[k]} onChange={e => setPrefs({ own: true, ...eff, [k]: Number(e.target.value) })} /></div> })}
        {p.own && <button className="sym-btn w-full mt-2 opacity-80" onClick={() => setPrefs({ own: false })}>Use the site default</button>}
      </div>
      <div className="glass p-4">
        <h3 className="font-semibold mb-1">🔊 Sound</h3>
        <div className="row"><span>Background music<small className="block text-gray-500">Plays if the admin added a track.</small></span><Toggle on={p.music} set={v => setPrefs({ music: v })} /></div>
        <div className="row"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value={p.vol} onChange={e => setPrefs({ vol: Number(e.target.value) })} /></div>
      </div>
      {session && <div className="glass p-4">
        <h3 className="font-semibold mb-2">👤 Account</h3>
        <p className="text-sm text-gray-400 mb-2">Logged in as <b className="text-white">{profile?.display_name || profile?.username}</b></p>
        <div className="flex gap-2 flex-wrap mb-3"><Link to="/profile" className="sym-btn">Edit profile</Link>{isAdmin && <Link to="/admin" className="sym-btn">Admin panel</Link>}{isAdmin && <Link to="/admin/site-style" className="sym-btn">🎨 Site style</Link>}<Link to="/rules" className="sym-btn">Guild rules</Link></div>
        <input className="sym-inp" type="password" placeholder="New password (min 6)" value={npw} onChange={e => setNpw(e.target.value)} />
        <button className="sym-btn w-full" onClick={changePw}>Change my password</button>
        {msg && <p className="text-amber-300 text-sm mt-2">{msg}</p>}
        <button className="sym-btn danger w-full mt-3" onClick={() => supabase.auth.signOut().then(() => nav('/login'))}>Logout</button>
      </div>}
      <div className="glass p-4 text-sm">
        <h3 className="font-semibold mb-2">ℹ️ About SYMBIOTES</h3>
        <p className="text-gray-300">Official guild website.</p>
        <p className="text-gray-300 mt-2">Created by <b className="text-white">RIN (Rinshad)</b>, one of the founders of the SYMBIOTES guild. Back supporter: <b className="text-white">Shahil</b>.</p>
        <p className="text-gray-500 text-xs mt-2">Accounts are created by the admin only.</p>
      </div>
    </div>
  )
}
