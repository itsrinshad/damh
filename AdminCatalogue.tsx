// Admin: add or remove profile customisation items from the website. Hide/show any item (including the built-in ones) and upload your own rings.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { RARITY, SLOTS, type Item, type Rarity as R, type Slot } from './styleCatalog'
import { loadStyles } from './styleStore'
import { ItemPreview, Rarity } from './StyleKit'
import { SITE_BUCKET, sitePublicUrl } from './media'
import { useAllItems } from './Studio'
import { saveHidden, useHiddenItems } from './hiddenItems'
import { FrameFitter } from './FrameFitter'

const MAX_MB = 5
export function AdminCatalogue() {
  const { session } = useAuth(); const all = useAllItems(); const hidden = useHiddenItems(); const [slot, setSlot] = useState<Slot | 'all'>('all'); const [msg, setMsg] = useState('')
  const [name, setName] = useState(''); const [rarity, setRarity] = useState<R>('epic'); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [fit, setFit] = useState(false); const [fitted, setFitted] = useState<Blob | null>(null); const [fitUrl, setFitUrl] = useState('')
  const list = useMemo(() => all.filter(i => slot === 'all' || i.slot === slot), [all, slot])
  const toggle = async (i: Item) => { const next = new Set(hidden); next.has(i.code) ? next.delete(i.code) : next.add(i.code); const e = await saveHidden([...next]); setMsg(e ? '❌ ' + e + ' (an admin needs write access to site_settings)' : next.has(i.code) ? `“${i.name}” is hidden from members.` : `“${i.name}” is visible again.`) }
  const pickFile = (f?: File) => {
    if (!f) return; setFitted(null); setFitUrl('')
    if (!/^image\/(png|webp|svg\+xml)$/.test(f.type)) { setFile(null); return setMsg('Use a PNG, WebP or SVG ring (it needs a transparent centre).') }
    if (f.size > MAX_MB * 1048576) { setFile(null); return setMsg(`That image is ${(f.size / 1048576).toFixed(1)} MB. Maximum ${MAX_MB} MB.`) }
    setMsg(''); setFile(f); setFit(true)   // opens the crop / size tool straight away
  }
  const addRing = async () => {
    const nm = name.trim(); if (nm.length < 2) return setMsg('Give the ring a name (2+ letters).'); if (!file) return setMsg('Choose a PNG, WebP or SVG image with a transparent centre.')
    if (!fitted) { setFit(true); return setMsg('Fit the ring to the round photo first (Crop & size).') }
    setBusy(true); const code = 'cu_' + Date.now().toString(36)
    const up = await supabase.storage.from(SITE_BUCKET).upload(`style/${code}.png`, fitted, { contentType: 'image/png', cacheControl: '31536000' }); if (up.error) { setBusy(false); return setMsg('Upload failed: ' + up.error.message) }
    const r = await supabase.from('style_items').insert({ code, slot: 'frame', name: nm, rarity, description: 'Custom ring', media: sitePublicUrl(`style/${code}.png`), kind: 'image', custom: true, is_free: false, created_by: session!.user.id })
    if (r.error) { await supabase.storage.from(SITE_BUCKET).remove([`style/${code}.png`]); setBusy(false); return setMsg('❌ ' + r.error.message + (/enum|check|rarity/i.test(r.error.message) ? ' (run SYMBIOTES_PHASE14.sql so “Ultra” is allowed, or pick another rarity)' : '')) }
    setBusy(false); setMsg('Ring added ✅ Gift it or make it a quest reward.'); setName(''); setFile(null); setFitted(null); setFitUrl(''); loadStyles()
  }
  const del = async (i: Item) => {
    if (!confirm(`PERMANENTLY delete “${i.name}”? It is removed for everyone, members who own or wear it lose it, and this cannot be undone.`)) return
    const r = await supabase.rpc('style_item_delete', { p_code: i.code }); if (r.error) return setMsg('❌ ' + r.error.message)
    const p = i.media?.split(`/${SITE_BUCKET}/`)[1]; if (p) await supabase.storage.from(SITE_BUCKET).remove([p]); setMsg('Deleted'); loadStyles()
  }
  return (
    <div className="space-y-3 pb-10">
      <div className="flex items-center gap-2"><h2 className="text-xl font-bold">🧩 Customisation items</h2><span className="ml-auto" /><Link to="/admin/style" className="sym-btn !py-1 text-sm">Quests &amp; gifts</Link></div>
      <section className="glass p-3 space-y-2"><b>➕ Add a ring</b>
        <p className="text-xs text-gray-400">Upload a PNG, WebP or SVG ring with a transparent centre. A fitting tool opens so you can crop, resize and move it until it sits perfectly around the round photo. Videos and titles are added in Quests &amp; gifts → Items.</p>
        <input className="sym-inp" placeholder="Ring name" maxLength={40} value={name} onChange={e => setName(e.target.value)} />
        <select className="sym-inp" value={rarity} onChange={e => setRarity(e.target.value as R)}>{(Object.keys(RARITY) as R[]).map(r => <option key={r} value={r}>{RARITY[r].label}</option>)}</select>
        <label className="upload-box !p-3 text-sm block" style={{ cursor: 'pointer' }}>🖼 {file ? file.name : `Choose a ring image (max ${MAX_MB} MB)`}<input type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} /></label>
        {file && <div className="flex items-center gap-2">{fitUrl && <span className="gift-pv"><span style={{ position: 'relative', width: 56, height: 56, display: 'block' }}><span style={{ position: 'absolute', left: '50%', top: '50%', width: 56 / 2.2, height: 56 / 2.2, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'linear-gradient(135deg,#f0b48a,#6b3f33)' }} /><img src={fitUrl} alt="" style={{ position: 'absolute', inset: 0, width: 56, height: 56 }} /></span></span>}<button type="button" className="sym-btn !py-1 text-sm" onClick={() => setFit(true)}>✂️ Crop &amp; size {fitted ? '(fitted ✓)' : ''}</button></div>}
        {fit && file && <FrameFitter file={file} onCancel={() => setFit(false)} onDone={blob => { setFitted(blob); setFitUrl(URL.createObjectURL(blob)); setFit(false) }} />}
        <button className="sym-btn w-full" disabled={busy} onClick={addRing}>{busy ? 'Uploading…' : 'Add ring'}</button>
      </section>
      <section className="space-y-2"><div className="flex gap-1 overflow-x-auto"><button className={'sym-btn !py-1 text-sm ' + (slot === 'all' ? '' : 'opacity-60')} onClick={() => setSlot('all')}>All</button>{SLOTS.map(s => <button key={s.id} className={'sym-btn !py-1 text-sm whitespace-nowrap ' + (slot === s.id ? '' : 'opacity-60')} onClick={() => setSlot(s.id)}>{s.label}</button>)}</div>
        <b>{list.length} items · {[...hidden].filter(c => all.some(i => i.code === c)).length} hidden</b>
        {list.map(i => <div key={i.code} className={'glass p-3 flex items-center gap-3' + (hidden.has(i.code) ? ' opacity-50' : '')}><div className="gift-pv"><ItemPreview item={i} /></div>
          <div className="flex-1 min-w-0"><b className="truncate block">{i.name}</b><Rarity r={i.rarity} /><small className="text-gray-500 ml-2">{i.custom ? 'custom' : 'built-in'}</small></div>
          <div className="flex flex-col gap-1"><button className="sym-btn !py-1 text-xs" onClick={() => toggle(i)}>{hidden.has(i.code) ? 'Show' : 'Hide'}</button>{i.custom && <button className="sym-btn danger !py-1 text-xs" onClick={() => del(i)}>Delete forever</button>}</div></div>)}
      </section>
      {msg && <p className="text-amber-300 text-sm" role="status">{msg}</p>}
    </div>)
}
