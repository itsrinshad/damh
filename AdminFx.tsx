import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PFX_LABELS, PRESETS, SiteFx, previewSiteFx, revertPreview, saveSiteFx, useSiteFx } from './siteFx'

/** Admin → Look & effects: site-wide contrast, glow and premium effects. Changes preview on this phone first; Save makes them live for everyone. */
export function AdminFx() {
  const live = useSiteFx(); const [v, setV] = useState<SiteFx>(live); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { setV(live) }, [live])
  useEffect(() => () => revertPreview(), [])
  const upd = (n: SiteFx) => { setV(n); previewSiteFx(n); setMsg('') }
  const save = async () => { setBusy(true); const e = await saveSiteFx(v); setBusy(false); setMsg(e ? '❌ ' + e + ' (an admin needs write access to site_settings)' : '✅ Saved. Every member sees this look now.') }
  const dirty = JSON.stringify(v) !== JSON.stringify(live)
  const sl = (k: 'fx' | 'bri' | 'sat' | 'con', label: string, hint: string, lo: number, hi: number) => (
    <div className="row"><span>{label}<small className="block text-gray-500">{hint} · {v[k]}%</small></span><input type="range" min={lo} max={hi} step="5" value={v[k]} onChange={e => upd({ ...v, [k]: Number(e.target.value), preset: 'custom' })} /></div>)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Link to="/admin" className="text-xs underline text-gray-400">← Admin</Link><h1 className="h1">Look &amp; effects</h1></div>
      <p className="text-sm text-gray-400">Move a slider or switch to see it on <b className="text-white">your screen right away</b>. Members only get it after you press <b className="text-white">Save</b>. Members can still tone it down on their own phone in Settings.</p>
      <div className="glass p-4">
        <h3 className="font-semibold mb-2">Style preset</h3>
        <div className="grid grid-cols-3 gap-2">{(['clean', 'premium', 'ultra'] as const).map(k => <button key={k} className={'sym-btn' + (v.preset === k ? '' : ' opacity-60')} onClick={() => upd({ ...PRESETS[k] })}>{k === 'clean' ? 'Clean' : k === 'premium' ? 'Premium' : 'Ultra'}</button>)}</div>
        <p className="text-xs text-gray-500 mt-2">Clean: flat and calm. Premium: gold foil, borders, glints. Ultra: everything, for strong phones and PCs.</p>
      </div>
      <div className="glass p-4">
        <h3 className="font-semibold mb-1">Contrast &amp; colour</h3>
        {sl('con', 'Contrast', 'Higher = deeper darks, brighter highlights', 70, 140)}
        {sl('fx', 'Glow strength', 'How strong lights and borders glow', 0, 150)}
        {sl('bri', 'Background brightness', 'The moving background behind the pages', 40, 130)}
        {sl('sat', 'Colour saturation', 'How rich the colours look', 30, 150)}
      </div>
      <div className="glass p-4">
        <h3 className="font-semibold mb-1">Premium effects</h3>
        <p className="text-xs text-gray-500 mb-1">Heavier effects switch off by themselves on weak phones, Lite mode and Data Saver.</p>
        {PFX_LABELS.map(x => <div className="row" key={x.k}><span>{x.name}<small className="block text-gray-500">{x.tip}</small></span>
          <button className={'fx-sw' + (v.p[x.k] ? ' on' : '')} role="switch" aria-checked={v.p[x.k]} aria-label={x.name} onClick={() => upd({ ...v, preset: 'custom', p: { ...v.p, [x.k]: !v.p[x.k] } })}><i /></button></div>)}
      </div>
      <div className="glass p-4 flex flex-wrap gap-2 items-center">
        <button className="sym-btn" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save for everyone'}</button>
        <button className="sym-btn opacity-80" disabled={!dirty} onClick={() => { setV(live); revertPreview(); setMsg('') }}>Cancel</button>
        <button className="sym-btn opacity-80 ml-auto" onClick={() => upd({ ...PRESETS.premium })}>Reset to Premium</button>
        {msg && <p className="w-full text-sm text-gray-300">{msg}</p>}
      </div>
    </div>)
}
