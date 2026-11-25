import { useEffect, useMemo, useRef, useState, type PointerEvent as PEv } from 'react'

/** Shared photo tools: circular "Add photo" control, crop / zoom / position / auto-fit / live preview modal,
 *  and a background-picture preview. Used for profile photos AND group photos / group backgrounds. */

export const OUT = 512   // saved avatar size in pixels (square; it is shown inside a circle everywhere)

const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = src })
const toBlob = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Could not process the photo.'))), 'image/jpeg', q))

/** Scales a picture down (long side <= max) and returns a light JPEG. Used for backgrounds so uploads stay small. */
export async function shrinkImage(file: Blob, max = 1280, q = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url); const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await toBlob(c, q)
  } finally { URL.revokeObjectURL(url) }
}

type View = { z: number; x: number; y: number }   // zoom (1 = photo just covers the circle) and offset of the photo centre, in stage pixels
const MAXZ = 4

export function PhotoCropper({ file, title = 'Adjust your photo', saveLabel = 'Save photo', frameSrc, onCancel, onSave }: {
  file: Blob; title?: string; saveLabel?: string; frameSrc?: string; onCancel: () => void; onSave: (blob: Blob) => Promise<void>
}) {
  const [url, setUrl] = useState(''); const [img, setImg] = useState<HTMLImageElement | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [note, setNote] = useState('')
  const S = useMemo(() => Math.max(200, Math.min(320, (typeof window !== 'undefined' ? window.innerWidth : 360) - 64)), [])
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 })
  const ptrs = useRef(new Map<number, { x: number; y: number }>()); const pinch = useRef<{ d: number; z: number } | null>(null)

  useEffect(() => {
    const u = URL.createObjectURL(file); setUrl(u); setImg(null); setErr('')
    loadImage(u).then(setImg, () => setErr('This photo cannot be opened. Please choose a JPG, PNG or WebP picture.'))
    return () => URL.revokeObjectURL(u)
  }, [file])

  const iw = img?.naturalWidth ?? 1; const ih = img?.naturalHeight ?? 1
  const base = Math.max(S / iw, S / ih)                    // scale at which the photo just covers the circle
  const contain = Math.min(S / iw, S / ih) / base          // zoom at which the WHOLE photo fits inside the circle
  const minZ = Math.min(1, contain)
  const clampView = (v: View): View => {
    const z = Math.min(MAXZ, Math.max(minZ, v.z)); const sc = base * z
    const mx = Math.max(0, (iw * sc - S) / 2); const my = Math.max(0, (ih * sc - S) / 2)
    return { z, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) }
  }
  const upd = (f: (v: View) => View) => setView(v => clampView(f(v)))
  const v = clampView(view)

  const autoFit = async () => {
    if (!img) return
    setNote('')
    // Smart centring on a face where the browser supports it; otherwise fill the circle and centre the photo.
    try {
      const FD = (window as unknown as { FaceDetector?: new (o: object) => { detect: (i: HTMLImageElement) => Promise<{ boundingBox: DOMRectReadOnly }[]> } }).FaceDetector
      if (FD) {
        const f = (await new FD({ fastMode: true, maxDetectedFaces: 1 }).detect(img))[0]
        if (f) {
          const b = f.boundingBox; const z = Math.min(MAXZ, Math.max(1, (0.46 * S) / (b.width * base))); const sc = base * z
          setView(clampView({ z, x: -(b.x + b.width / 2 - iw / 2) * sc, y: -(b.y + b.height / 2 - ih / 2) * sc })); setNote('Centred on your face ✓'); return
        }
      }
    } catch { /* not supported: fall through */ }
    setView({ z: 1, x: 0, y: 0 }); setNote('Fitted neatly to the circle ✓')
  }
  const fitWhole = () => { setView(clampView({ z: contain, x: 0, y: 0 })); setNote('Whole photo inside the circle') }

  const down = (e: PEv<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: v.z } }
  }
  const move = (e: PEv<HTMLDivElement>) => {
    const p = ptrs.current.get(e.pointerId); if (!p) return
    const nx = e.clientX, ny = e.clientY; ptrs.current.set(e.pointerId, { x: nx, y: ny })
    if (ptrs.current.size === 2 && pinch.current) { const [a, b] = [...ptrs.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const st = pinch.current; upd(c => ({ ...c, z: st.z * d / st.d })) }
    else if (ptrs.current.size === 1) { const dx = nx - p.x, dy = ny - p.y; upd(c => ({ ...c, x: c.x + dx, y: c.y + dy })) }
  }
  const up = (e: PEv<HTMLDivElement>) => { ptrs.current.delete(e.pointerId); pinch.current = null }

  const save = async () => {
    if (!img) return
    setBusy(true); setErr('')
    try {
      const k = OUT / S; const sc = base * v.z * k; const c = document.createElement('canvas'); c.width = c.height = OUT
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#0B0720'; ctx.fillRect(0, 0, OUT, OUT); ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, OUT / 2 + v.x * k - (iw * sc) / 2, OUT / 2 + v.y * k - (ih * sc) / 2, iw * sc, ih * sc)
      await onSave(await toBlob(c, 0.9))
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save the photo.'); setBusy(false) }
  }

  // draws the photo inside a box of diameter d, using the same maths as the saved result (so preview == result)
  const layer = (d: number) => {
    const k = d / S; const sc = base * v.z * k
    return <img src={url} alt="" draggable={false} style={{ position: 'absolute', maxWidth: 'none', width: iw * sc, height: ih * sc, left: d / 2 + v.x * k - (iw * sc) / 2, top: d / 2 + v.y * k - (ih * sc) / 2, userSelect: 'none', pointerEvents: 'none' }} />
  }

  return (
    <div className="crp-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="crp-box glass">
        <div className="flex items-center justify-between mb-2"><b>{title}</b><button className="crp-x" onClick={onCancel} aria-label="Close" disabled={busy}>✕</button></div>
        {err && !img && <p className="text-amber-300 text-sm py-6 text-center">{err}</p>}
        {!img && !err && <p className="text-gray-400 text-sm py-10 text-center animate-pulse">Loading photo…</p>}
        {img && <>
          <div className="crp-stage" style={{ width: S, height: S }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            onWheel={e => upd(c => ({ ...c, z: c.z * (e.deltaY < 0 ? 1.06 : 0.94) }))}>
            {layer(S)}
            <div className="crp-mask" /><div className="crp-ring" />
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-1">Drag to move · pinch or use the slider to resize</p>
          <div className="flex items-center gap-2 mt-2"><span className="text-xs text-gray-400">−</span>
            <input type="range" className="flex-1" min={minZ} max={MAXZ} step={0.01} value={v.z} onChange={e => upd(c => ({ ...c, z: Number(e.target.value) }))} aria-label="Zoom" /><span className="text-xs text-gray-400">+</span></div>
          <div className="flex gap-2 flex-wrap mt-2">
            <button type="button" className="sym-btn !py-1 flex-1" onClick={autoFit}>✨ Auto-fit</button>
            <button type="button" className="sym-btn !py-1 flex-1" onClick={fitWhole}>Fit whole photo</button>
            <button type="button" className="sym-btn !py-1" onClick={() => { setView({ z: 1, x: 0, y: 0 }); setNote('') }}>Reset</button>
          </div>
          {note && <p className="text-emerald-300 text-xs mt-1 text-center">{note}</p>}
          <div className="flex items-center justify-center gap-4 mt-3"><span className="text-xs text-gray-400">Preview</span>
            <span className="crp-pv" style={{ width: 84, height: 84 }}>{layer(84)}</span>
            <span className="crp-pv" style={{ width: 44, height: 44 }}>{layer(44)}</span></div>
          {frameSrc && <div className="flex flex-col items-center mt-2"><span className="text-xs text-gray-400 mb-1">With your frame</span>
            <span style={{ position: 'relative', width: 150, height: 150, display: 'block' }}>
              <span className="crp-pv" style={{ position: 'absolute', left: '50%', top: '50%', width: 150 / 2.2, height: 150 / 2.2, transform: 'translate(-50%,-50%)' }}>{layer(150 / 2.2)}</span>
              <img src={frameSrc} alt="" style={{ position: 'absolute', inset: 0, width: 150, height: 150, maxWidth: 'none', pointerEvents: 'none' }} /></span></div>}
          {err && <p className="text-amber-300 text-xs mt-2 text-center">{err}</p>}
          <div className="flex gap-2 mt-3"><button className="sym-btn flex-1" onClick={onCancel} disabled={busy}>Cancel</button><button className="sym-btn ok flex-1" onClick={save} disabled={busy}>{busy ? 'Saving…' : saveLabel}</button></div>
        </>}
      </div>
    </div>
  )
}

/** Round "Add photo" control: shows the current photo (or the initial), opens the file picker, then the cropper. */
export function PhotoPick({ url, name, onSave, title, saveLabel, size = 76, disabled, hint, frameSrc }: {
  frameSrc?: string; url?: string | null; name?: string | null; onSave: (blob: Blob) => Promise<void>; title?: string; saveLabel?: string; size?: number; disabled?: boolean; hint?: string
}) {
  const has = !!url; const [file, setFile] = useState<File | null>(null); const [msg, setMsg] = useState('')
  const pick = (f?: File) => { if (!f) return; if (!f.type.startsWith('image/')) { setMsg('Please choose a picture file.'); return } setMsg(''); setFile(f) }
  return (
    <div className="flex items-center gap-3">
      <label className={'crp-pick' + (disabled ? ' off' : '')} style={{ width: size, height: size }} title={has ? 'Change photo' : 'Add photo'}>
        <span className="crp-pick-in">{url ? <img src={url} alt="" /> : <b style={{ fontSize: size * 0.4 }}>{(name || '?').slice(0, 1).toUpperCase()}</b>}</span>
        <span className="crp-cam" aria-hidden="true">📷</span>
        <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} aria-label={has ? 'Change photo' : 'Add photo'} />
      </label>
      <div className="min-w-0"><div className="font-semibold text-sm">{has ? 'Change photo' : 'Add photo'}</div><div className="text-xs text-gray-400">{hint ?? 'Crop, resize and preview before saving.'}</div>{msg && <div className="text-amber-300 text-xs">{msg}</div>}</div>
      {file && <PhotoCropper file={file} title={title} saveLabel={saveLabel} frameSrc={frameSrc} onCancel={() => setFile(null)} onSave={async b => { await onSave(b); setFile(null) }} />}
    </div>
  )
}

/** Preview of a chat background picture behind sample bubbles, before it is saved. */
export function BackgroundPreview({ file, onCancel, onSave }: { file: Blob; onCancel: () => void; onSave: (blob: Blob) => Promise<void> }) {
  const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u) }, [file])
  const save = async () => { setBusy(true); setErr(''); try { await onSave(await shrinkImage(file)) } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); setBusy(false) } }
  return (
    <div className="crp-modal" role="dialog" aria-modal="true" aria-label="Preview background">
      <div className="crp-box glass">
        <div className="flex items-center justify-between mb-2"><b>Preview chat background</b><button className="crp-x" onClick={onCancel} aria-label="Close" disabled={busy}>✕</button></div>
        <div className="crp-bgprev" style={{ backgroundImage: `linear-gradient(rgba(8,5,25,.45),rgba(8,5,25,.45)),url(${url})` }}>
          <div className="mrow"><div className="bubble"><div className="text-xs text-amber-300">Member</div>Hello team 👋<span className="btime">10:42</span></div></div>
          <div className="mrow me"><div className="bubble me">Looks great!<span className="btime">10:43</span></div></div>
        </div>
        {err && <p className="text-amber-300 text-xs mt-2 text-center">{err}</p>}
        <div className="flex gap-2 mt-3"><button className="sym-btn flex-1" onClick={onCancel} disabled={busy}>Cancel</button><button className="sym-btn ok flex-1" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Use background'}</button></div>
      </div>
    </div>
  )
}
