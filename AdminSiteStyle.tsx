import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE_STYLES, MAX_FX_BYTES, saveCustomFx, saveSiteStyle, useSiteStyle } from './siteStyle'
import { CustomFx, FxCanvas } from './SiteFx'
import { WebField } from './WebField'

const promptFor = (desc: string, a: string, b: string) =>
  `Write ONE self-contained HTML file (inline CSS and JavaScript only: no external files, no libraries, no network requests, no links, no alert or prompt) that is a full-screen animated BACKGROUND EFFECT for a dark gaming website.\n\nEffect idea: ${desc.trim() || 'glowing fireflies drifting slowly over a dark night sky'}.\n\nRules:\n- Use one <canvas> that fills the window and resizes with it. Background colour #05060a (very dark).\n- Main colours: ${a} and ${b}.\n- Must run smoothly on cheap phones: at most 80 moving things, requestAnimationFrame capped at 30 fps, pause when document.hidden, no heavy blur or shadowBlur, devicePixelRatio capped at 1.5.\n- Calm enough that text on top stays readable (keep it dim, no flashing faster than 2 times per second).\n- Do not react to clicks or touches.\n\nReply with only the code in one code block.`

// Admin: choose the look of the whole site (members follow live) and paste a custom effect.
export function AdminSiteStyle() {
  const { id: live, custom } = useSiteStyle()
  const [pick, setPick] = useState(live); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const [desc, setDesc] = useState(''); const [code, setCode] = useState(''); const [prev, setPrev] = useState(false); const [loaded, setLoaded] = useState(false)
  useEffect(() => { setPick(live) }, [live])
  useEffect(() => { if (!loaded && custom.html) { setCode(custom.html); setLoaded(true) } }, [custom.html, loaded])
  const sel = SITE_STYLES.find(s => s.id === pick) ?? SITE_STYLES[0]
  const prompt = useMemo(() => promptFor(desc, sel.a, sel.b), [desc, sel])
  const apply = async () => { setBusy(true); const e = await saveSiteStyle(pick); setBusy(false); setMsg(e ? '❌ ' + e + ' (an admin needs write access to site_settings)' : `✅ ${sel.name} is now live for every member.`) }
  const copy = async () => { try { await navigator.clipboard.writeText(prompt); setMsg('Prompt copied ✅ Paste it into any AI, then paste its code below.') } catch { setMsg('Copy failed: select the prompt text and copy it by hand.') } }
  const use = async (enabled: boolean) => {
    if (enabled && code.trim().length < 20) return setMsg('Paste the effect code first.')
    setBusy(true); const e = await saveCustomFx({ enabled, html: code.trim(), title: desc.trim().slice(0, 60) }); setBusy(false)
    setMsg(e ? '❌ ' + e : enabled ? '✅ Your custom effect is now live for every member.' : 'Custom effect turned off. The style above is shown again.')
  }
  const wipe = async () => { if (!confirm('Delete the saved custom effect?')) return; setBusy(true); const e = await saveCustomFx({ enabled: false, html: '', title: '' }); setBusy(false); if (!e) { setCode(''); setPrev(false); setLoaded(false) } setMsg(e ? '❌ ' + e : 'Deleted.') }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Link to="/admin" className="text-xs underline text-gray-400">← Admin</Link><h1 className="h1">Site style</h1></div>
      <p className="text-sm text-gray-400">Members cannot change the theme. Whatever you pick here changes the colours and the moving background for <b className="text-white">everyone, instantly</b>.</p>
      {msg && <p className="glass p-3 text-sm" role="status">{msg}</p>}

      <section className="glass p-3">
        <div className="flex items-center gap-2 flex-wrap"><b>🎨 Choose a style</b>{custom.enabled && <span className="chipx">custom effect is ON, it hides these</span>}</div>
        <div className="fx-prev mt-2" aria-label={`Preview of ${sel.name}`}>{sel.id === 'web' ? <WebField dim cls="fx-cv" /> : <FxCanvas key={sel.id} id={sel.id} cls="fx-cv" />}<span className="fx-prev-t">{sel.name}</span></div>
        <div className="sty-grid mt-3">{SITE_STYLES.map(s => (
          <button key={s.id} className={'sty' + (pick === s.id ? ' on' : '')} onClick={() => setPick(s.id)} aria-pressed={pick === s.id}>
            <i style={{ background: `linear-gradient(135deg,${s.a},${s.b})` }} /><b>{s.name}</b><small>{s.tag}</small>{live === s.id && <em>LIVE</em>}
          </button>))}</div>
        <button className="sym-btn w-full mt-3" disabled={busy || pick === live} onClick={apply}>{pick === live ? 'This style is live' : `Make “${sel.name}” live for everyone`}</button>
      </section>

      <section className="glass p-3">
        <b>✨ Custom web effect</b>
        <p className="text-xs text-gray-400 mt-1">Describe an effect, copy the prompt, paste it into any AI (ChatGPT, Claude, Gemini…), then paste the code it gives you here. It replaces the style background for everyone until you turn it off.</p>
        <input className="sym-inp mt-2" maxLength={160} placeholder="Describe it, e.g. red lightning over a burning city" value={desc} onChange={e => setDesc(e.target.value)} />
        <pre className="fx-prompt">{prompt}</pre>
        <button className="sym-btn w-full" onClick={copy}>📋 Copy the prompt</button>
        <textarea className="sym-inp mt-3 fx-code" rows={9} spellCheck={false} placeholder="Paste the HTML (or JavaScript) the AI wrote here…" value={code} onChange={e => { setCode(e.target.value); setPrev(false) }} />
        <p className={'text-xs ' + (code.length > MAX_FX_BYTES ? 'text-rose-300' : 'text-gray-500')}>{(code.length / 1000).toFixed(1)} KB of {MAX_FX_BYTES / 1000} KB</p>
        {prev && code.trim() && <div className="fx-prev mt-2"><CustomFx html={code} /><span className="fx-prev-t">Preview</span></div>}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="sym-btn" disabled={!code.trim()} onClick={() => setPrev(p => !p)}>{prev ? 'Hide preview' : '👁 Preview'}</button>
          <button className="sym-btn ok" disabled={busy || !code.trim()} onClick={() => use(true)}>Use for everyone</button>
          <button className="sym-btn" disabled={busy || !custom.enabled} onClick={() => use(false)}>Turn off</button>
          <button className="sym-btn danger" disabled={busy || !custom.html} onClick={wipe}>Delete saved</button>
        </div>
        <p className="text-xs text-gray-500 mt-3">🔒 Safe by design: the effect runs in a sandboxed frame. It cannot read the site, logins or member data, and it cannot be tapped. Members with Lite mode on do not load it.</p>
      </section>
    </div>)
}
