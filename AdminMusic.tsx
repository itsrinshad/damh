// Admin: website background music. Upload tracks, pick one, volume, on/off, preview. Members hear it only after their first tap and can always mute.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { SITE_BUCKET, sitePublicUrl } from './media'

type Music = { path?: string; url?: string; name?: string; enabled?: boolean; volume?: number }
type Track = { path: string; url: string; name: string; size: number }
const MAX_MB = 30; const OK = /^audio\/(mpeg|mp3|mp4|x-m4a|aac|ogg|wav|x-wav|webm)$/
const nice = (n: string) => n.replace(/^\d+-/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ')

export function AdminMusic() {
  const [cur, setCur] = useState<Music>({}); const [tracks, setTracks] = useState<Track[]>([]); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const [prev, setPrev] = useState(''); const au = useRef<HTMLAudioElement>(null)
  const load = useCallback(async () => {
    const s = await supabase.from('site_settings').select('value').eq('key', 'bg_music').maybeSingle(); setCur((s.data?.value as Music) ?? {})
    const l = await supabase.storage.from(SITE_BUCKET).list('music', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
    setTracks((l.data ?? []).filter(f => f.name && !f.name.startsWith('.')).map(f => ({ path: 'music/' + f.name, url: sitePublicUrl('music/' + f.name), name: nice(f.name), size: Number((f.metadata as any)?.size ?? 0) })))
  }, [])
  useEffect(() => { load() }, [load])
  const save = async (v: Music, ok = 'Saved ✅ Members get it the next time they open the site.') => {
    const r = await supabase.from('site_settings').upsert({ key: 'bg_music', value: v, updated_at: new Date().toISOString() })
    if (r.error) return setMsg('❌ ' + r.error.message + ' (an admin needs write access to site_settings)'); setCur(v); setMsg(ok); window.dispatchEvent(new Event('sym-music'))
  }
  const upload = async (f: File | undefined) => {
    if (!f) return
    if (!OK.test(f.type)) return setMsg('Use an MP3, M4A, OGG, WAV or WebM audio file.')
    if (f.size > MAX_MB * 1048576) return setMsg(`That file is ${(f.size / 1048576).toFixed(1)} MB. The maximum is ${MAX_MB} MB. Trim or compress it first.`)
    setBusy(true); setMsg('Uploading…'); const safe = f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60)
    const up = await supabase.storage.from(SITE_BUCKET).upload(`music/${Date.now()}-${safe}`, f, { contentType: f.type, cacheControl: '31536000' }); setBusy(false)
    if (up.error) return setMsg('❌ Upload failed: ' + up.error.message + (/mime|type/i.test(up.error.message) ? ' (run SYMBIOTES_PHASE12.sql so the bucket accepts audio)' : ''))
    setMsg('Uploaded ✅ Preview it, then press “Use this track”.'); load()
  }
  const use = (t: Track) => save({ ...cur, path: t.path, url: t.url, name: t.name, enabled: true, volume: cur.volume ?? 0.6 })
  const del = async (t: Track) => {
    if (!confirm(`Delete “${t.name}”?`)) return; const r = await supabase.storage.from(SITE_BUCKET).remove([t.path]); if (r.error) return setMsg('❌ ' + r.error.message)
    if (cur.path === t.path) await save({ enabled: false }, 'Deleted. Music is now off.'); else setMsg('Deleted'); if (prev === t.url) setPrev(''); load()
  }
  const vol = cur.volume ?? 0.6
  return (
    <div className="space-y-3 pb-10">
      <div className="flex items-center gap-2"><h2 className="text-xl font-bold">🎵 Website music</h2><span className="ml-auto" /><Link to="/admin" className="sym-btn !py-1 text-sm">Admin</Link></div>
      <section className="glass p-3 space-y-2">
        <div className="row"><span>Music on the website<small className="block text-gray-500">{cur.url ? 'Playing: ' + (cur.name ?? 'track') : 'No track chosen yet'}</small></span>
          <button className={'sw' + (cur.enabled ? ' on' : '')} aria-pressed={!!cur.enabled} disabled={!cur.url} onClick={() => save({ ...cur, enabled: !cur.enabled })} /></div>
        <label className="block text-sm">Volume: <b>{Math.round(vol * 100)}%</b><input className="w-full" type="range" min="0" max="1" step="0.05" value={vol} onChange={e => { const v = Number(e.target.value); setCur({ ...cur, volume: v }); if (au.current) au.current.volume = v }} onPointerUp={() => save({ ...cur, volume: vol }, 'Volume saved ✅')} onKeyUp={() => save({ ...cur, volume: vol }, 'Volume saved ✅')} /></label>
        <p className="text-[11px] text-gray-500">Music never starts by itself: browsers wait for the first tap. Every member has a mute button and their own volume in Settings.</p>
      </section>
      <section className="glass p-3">
        <label className="upload-box !p-3 text-sm block" style={{ cursor: 'pointer' }}>⬆️ {busy ? 'Uploading…' : `Upload a track (MP3, M4A, OGG, WAV, max ${MAX_MB} MB)`}
          <input type="file" accept="audio/*" className="hidden" disabled={busy} onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} /></label>
      </section>
      <section className="space-y-2"><b>Uploaded tracks ({tracks.length})</b>
        {tracks.map(t => <div key={t.path} className={'glass p-3 space-y-2' + (cur.path === t.path ? ' ring-1 ring-amber-400' : '')}>
          <div className="flex items-center gap-2"><span className="flex-1 min-w-0 truncate font-semibold">{cur.path === t.path ? '▶ ' : ''}{t.name}</span><small className="text-gray-500">{t.size ? (t.size / 1048576).toFixed(1) + ' MB' : ''}</small></div>
          <div className="flex gap-2 flex-wrap"><button className="sym-btn !py-1 text-sm" onClick={() => setPrev(prev === t.url ? '' : t.url)}>{prev === t.url ? '⏹ Stop preview' : '🎧 Preview'}</button>
            <button className="sym-btn ok !py-1 text-sm" disabled={cur.path === t.path} onClick={() => use(t)}>{cur.path === t.path ? 'In use' : 'Use this track'}</button>
            <button className="sym-btn danger !py-1 text-sm" onClick={() => del(t)}>Delete</button></div>
          {prev === t.url && <audio ref={au} src={t.url} controls autoPlay preload="none" style={{ width: '100%' }} onLoadedMetadata={e => { e.currentTarget.volume = vol }} />}
        </div>)}
        {!tracks.length && <p className="text-sm text-gray-400">No tracks yet. Upload one above.</p>}
      </section>
      {msg && <p className="text-amber-300 text-sm" role="status">{msg}</p>}
    </div>)
}
