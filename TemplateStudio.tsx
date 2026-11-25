// Customise: pick one of 10 templates, tweak colours / text / effects / photo + background framing, preview live, save or reset.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { ProfileCard } from './StyleKit'
import { setMyStyle, useEquip } from './styleStore'
import { ACCENTS, ANIMS, FONTS, Fx, TEMPLATES, TPL, cleanFx, isHex } from './templates'

type Tab = 'tpl' | 'color' | 'text' | 'fx' | 'frame'
type Draft = { template: string | null; accent: string | null; fx: Fx }
const same = (a: Draft, b: Draft) => JSON.stringify([a.template, a.accent, cleanFx(a.fx)]) === JSON.stringify([b.template, b.accent, cleanFx(b.fx)])

export function TemplateStudio() {
  const { session, profile } = useAuth(); const uid = session!.user.id; const eq = useEquip(uid)
  const [me, setMe] = useState<any>(null); const [stat, setStat] = useState<any>({}); const [tab, setTab] = useState<Tab>('tpl')
  const saved = useMemo<Draft>(() => ({ template: eq.template ?? null, accent: eq.accent ?? null, fx: cleanFx(eq.fx) }), [eq.template, eq.accent, eq.fx])
  const [draft, setDraft] = useState<Draft | null>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle().then(r => setMe(r.data))
    supabase.from('v_lb_lifetime').select('glory,rnk').eq('member_id', uid).maybeSingle().then(r => setStat((s: any) => ({ ...s, glory: r.data?.glory, rank: r.data?.rnk })))
    supabase.from('member_badges').select('badge_id', { count: 'exact', head: true }).eq('member_id', uid).then(r => setStat((s: any) => ({ ...s, badges: r.count ?? 0 })))
    // read straight from the table once so the editor starts from what is really saved
    supabase.from('member_style').select('template,accent,fx').eq('member_id', uid).maybeSingle().then(r => setDraft({ template: r.data?.template ?? null, accent: r.data?.accent ?? null, fx: cleanFx(r.data?.fx) }))
  }, [uid])
  if (!draft || !me) return <p className="text-center text-gray-400 mt-10">Loading…</p>
  const dirty = !same(draft, saved)
  const setFx = (p: Fx) => setDraft(d => ({ ...d!, fx: cleanFx({ ...d!.fx, ...p }) }))
  const clearKeys = (keys: (keyof Fx)[]) => setDraft(d => { const f = { ...d!.fx }; keys.forEach(k => delete f[k]); return { ...d!, fx: f } })
  const preview = { ...eq, template: draft.template, accent: draft.accent, fx: draft.fx }
  const save = async () => {
    setBusy(true); setMsg('')
    const r = await supabase.rpc('profile_template_save', { p_template: draft.template, p_accent: draft.accent, p_fx: cleanFx(draft.fx) }); setBusy(false)
    if (r.error) return setMsg('❌ ' + r.error.message + (/does not exist|schema cache|function/i.test(r.error.message) ? ' (an admin needs to run SYMBIOTES_PHASE10.sql)' : ''))
    setMyStyle(uid, { template: r.data.template, accent: r.data.accent, fx: r.data.fx }); setMsg('Saved ✅ Everyone who visits your profile now sees this design.')
  }
  const resetTemplate = () => { setDraft(d => ({ template: d!.template, accent: null, fx: {} })); setMsg('Back to the original look of this template. Press Save to keep it.') }
  const tabs: [Tab, string][] = [['tpl', '🎨 Template'], ['color', '🌈 Colors'], ['text', 'Aa Text'], ['fx', '✨ Effects'], ['frame', '🖼 Photo & background']]
  const f = draft.fx; const Rng = ({ k, label, lo, hi, step, d }: { k: 'avX' | 'avY' | 'avZ' | 'frZ' | 'bgX' | 'bgY' | 'bgZ'; label: string; lo: number; hi: number; step: number; d: number }) =>
    <label className="block text-xs text-gray-300 mb-2">{label}: <b>{(f[k] ?? d)}</b><input className="tpl-rng" type="range" min={lo} max={hi} step={step} value={f[k] ?? d} onChange={e => setFx({ [k]: Number(e.target.value) })} /></label>
  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2"><h2 className="text-xl font-bold">Customise profile</h2><span className="ml-auto" /><Link to="/style" className="sym-btn !py-1 text-sm">Frames &amp; items</Link></div>
      <ProfileCard p={{ ...me, glory: stat.glory, rank: stat.rank, badges: stat.badges ?? 0 }} equip={preview} size="lg" play />
      <div className="glass p-3">
        <div className="flex gap-1 overflow-x-auto mb-3" role="tablist">{tabs.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} className={'sym-btn !py-1 text-sm whitespace-nowrap ' + (tab === id ? '' : 'opacity-60')} onClick={() => setTab(id)}>{l}</button>)}</div>
        {tab === 'tpl' && <>
          <div className="tpl-row">
            <button className={'tpl-chip' + (!draft.template ? ' sel' : '')} onClick={() => setDraft(d => ({ ...d!, template: null }))}><span className="tpl-art" style={{ background: '#15101f' }} /><b>Classic<br /><small>no template</small></b></button>
            {TEMPLATES.map(t => <button key={t.id} data-tpl={t.id} className={'tpl-chip' + (draft.template === t.id ? ' sel' : '')} onClick={() => setDraft(d => ({ ...d!, template: t.id }))} aria-pressed={draft.template === t.id}><span className="tpl-art" /><b>{t.name}<br /><small className="opacity-70">{t.blurb}</small></b></button>)}
          </div>
          <p className="text-xs text-gray-400">{draft.template ? TPL[draft.template].name + ': ' + TPL[draft.template].blurb : 'Classic uses your frame, backdrop and card from Frames & items.'} Your name, photo, bio and links never change when you switch.</p>
        </>}
        {tab === 'color' && <>
          <p className="text-xs text-gray-400 mb-2">Accent colour (glow, buttons, borders)</p>
          <div className="flex flex-wrap gap-2 mb-3">{ACCENTS.map(c => <button key={c} aria-label={'Accent ' + c} onClick={() => setDraft(d => ({ ...d!, accent: c }))} style={{ background: c, width: 38, height: 38, borderRadius: 99, border: draft.accent === c ? '3px solid #fff' : '2px solid rgba(255,255,255,.25)' }} />)}
            <input type="color" aria-label="Custom accent" value={isHex(draft.accent) ? draft.accent : draft.template ? TPL[draft.template].accent : '#8b5cf6'} onChange={e => setDraft(d => ({ ...d!, accent: e.target.value }))} style={{ width: 38, height: 38, padding: 0, border: 0, background: 'none' }} /></div>
          <button className="sym-btn !py-1 text-sm" onClick={() => setDraft(d => ({ ...d!, accent: null }))}>Use template colour</button>
        </>}
        {tab === 'text' && <>
          <p className="text-xs text-gray-400 mb-2">Name style</p>
          <div className="flex flex-wrap gap-2 mb-3">{FONTS.map(o => <button key={o.id} className={'sym-btn !py-1 text-sm ' + ((f.font ?? 'sans') === o.id ? '' : 'opacity-60')} onClick={() => setFx({ font: o.id })}>{o.label}</button>)}</div>
          <p className="text-xs text-gray-400 mb-2">Name colour (replaces the name effect from your items)</p>
          <div className="flex items-center gap-2"><input type="color" aria-label="Name colour" value={f.nameColor ?? '#ffffff'} onChange={e => setFx({ nameColor: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: 0, background: 'none' }} /><button className="sym-btn !py-1 text-sm" onClick={() => clearKeys(['nameColor'])}>Use item name effect</button></div>
        </>}
        {tab === 'fx' && <>
          <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.on !== false} onChange={e => e.target.checked ? clearKeys(['on']) : setFx({ on: false })} />Profile effects &amp; animations on</label>
          <p className="text-xs text-gray-400 mb-2">Extra animation</p>
          <div className="flex flex-wrap gap-2">{ANIMS.map(o => <button key={o.id} className={'sym-btn !py-1 text-sm ' + ((f.anim ?? 'none') === o.id ? '' : 'opacity-60')} onClick={() => setFx({ anim: o.id })}>{o.label}</button>)}</div>
          <p className="text-[11px] text-gray-500 mt-2">Turn effects off for a still profile. Visitors who prefer reduced motion always see it still.</p>
        </>}
        {tab === 'frame' && <>
          <label className="upload-box !p-3 text-sm block mb-3" style={{ cursor: 'pointer' }}>📷 Change profile photo — go to <Link to="/profile" className="underline">your profile</Link></label>
          <p className="text-xs text-gray-300 mb-1 font-semibold">Photo &amp; frame fit</p>
          <p className="text-[11px] text-gray-500 mb-2">Fit your photo neatly inside the frame. The preview above updates live. For a fresh crop, change the photo on <Link to="/profile" className="underline">your profile</Link>.</p>
          <Rng k="avZ" label="Photo size" lo={0.6} hi={3} step={0.05} d={1} /><Rng k="avX" label="Photo left ↔ right" lo={0} hi={100} step={1} d={50} /><Rng k="avY" label="Photo up ↕ down" lo={0} hi={100} step={1} d={50} />
          <Rng k="frZ" label="Frame size" lo={0.8} hi={1.3} step={0.01} d={1} />
          <div className="flex gap-2 mb-3"><button className="sym-btn !py-1 text-sm" onClick={() => clearKeys(['avX', 'avY', 'avZ'])}>Reset photo</button><button className="sym-btn !py-1 text-sm" onClick={() => clearKeys(['frZ'])}>Reset frame size</button></div>
          <p className="text-xs text-gray-300 mb-1 font-semibold">Background framing</p>
          <Rng k="bgZ" label="Zoom" lo={1} hi={3} step={0.05} d={1} /><Rng k="bgX" label="Left ↔ Right" lo={0} hi={100} step={1} d={50} /><Rng k="bgY" label="Up ↕ Down" lo={0} hi={100} step={1} d={50} />
          <button className="sym-btn !py-1 text-sm" onClick={() => clearKeys(['bgX', 'bgY', 'bgZ'])}>Reset background</button>
          <p className="text-[11px] text-gray-500 mt-2">Background framing applies to your video backdrop. Upload one in Frames &amp; items.</p>
        </>}
      </div>
      {msg && <p className="text-amber-300 text-sm" role="status">{msg}</p>}
      <div className="tpl-bar">
        <button className="sym-btn" onClick={resetTemplate} disabled={!draft.template}>↺ Reset template</button>
        <button className="sym-btn" onClick={() => { setDraft(saved); setMsg('') }} disabled={!dirty}>Undo</button>
        <button className="sym-btn" onClick={save} disabled={!dirty || busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>)
}
