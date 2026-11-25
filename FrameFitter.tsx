import { useEffect, useMemo, useRef, useState } from 'react'

/** Admin tool: fits an uploaded ring picture to the round profile photo before it is saved.
 *  The photo circle is 1/2.2 of the ring picture, so the saved ring (800x800 transparent PNG) always lines up with every avatar.
 *  Size / left-right / up-down sliders, "Auto-fit" (finds the see-through centre by itself) and a live preview with a sample photo. */
export const FRAME_OUT = 800
const PHOTO_R = FRAME_OUT / 2.2 / 2   // radius of the photo circle inside the saved ring picture

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = src })

export function FrameFitter({ file, onCancel, onDone }: { file: Blob; onCancel: () => void; onDone: (png: Blob) => Promise<void> | void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null); const [err, setErr] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false)
  const [z, setZ] = useState(1); const [ox, setOx] = useState(0); const [oy, setOy] = useState(0); const [guide, setGuide] = useState(true)
  const cv = useRef<HTMLCanvasElement>(null); const P = useMemo(() => Math.max(220, Math.min(300, (typeof window !== 'undefined' ? window.innerWidth : 360) - 72)), [])

  useEffect(() => {
    const u = URL.createObjectURL(file); setImg(null); setErr('')
    load(u).then(i => { setImg(i) }, () => setErr('This image cannot be opened. Use a PNG, WebP or SVG ring with a transparent centre.'))
    return () => URL.revokeObjectURL(u)
  }, [file])

  const k0 = img ? FRAME_OUT / Math.max(img.naturalWidth || 1, img.naturalHeight || 1) : 1   // scale at which the whole picture fits
  /** draws the ring (optionally with a sample photo under it) into a canvas of side d */
  const draw = (ctx: CanvasRenderingContext2D, d: number, withPhoto: boolean) => {
    const k = d / FRAME_OUT; ctx.clearRect(0, 0, d, d)
    if (withPhoto) { const g = ctx.createLinearGradient(0, 0, d, d); g.addColorStop(0, '#f0b48a'); g.addColorStop(1, '#6b3f33'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d / 2, d / 2, PHOTO_R * k, 0, Math.PI * 2); ctx.fill() }
    if (img) { const w = img.naturalWidth * k0 * z * k, h = img.naturalHeight * k0 * z * k; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, d / 2 + ox * k - w / 2, d / 2 + oy * k - h / 2, w, h) }
    if (withPhoto && guide) { ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(d / 2, d / 2, PHOTO_R * k, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]) }
  }
  useEffect(() => { const c = cv.current; if (!c) return; const r = Math.min(2, window.devicePixelRatio || 1); c.width = c.height = Math.round(P * r); draw(c.getContext('2d')!, c.width, true) })

  /** finds the see-through centre of the ring and sizes / centres the ring so that centre equals the photo circle */
  const autoFit = () => {
    if (!img) return
    const m = 400 / Math.max(img.naturalWidth, img.naturalHeight, 1); const w = Math.max(1, Math.round(img.naturalWidth * m)), h = Math.max(1, Math.round(img.naturalHeight * m))
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0, w, h)
    const a = x.getImageData(0, 0, w, h).data; const op = (px: number, py: number) => a[(Math.round(py) * w + Math.round(px)) * 4 + 3] > 40
    const cx0 = w / 2, cy0 = h / 2
    if (op(cx0, cy0)) { setNote('The middle of this picture is not see-through. Use a ring with a transparent centre, or adjust by hand.'); return }
    const rs: number[] = []; let sx = 0, sy = 0
    for (let i = 0; i < 90; i++) { const t = i * Math.PI * 2 / 90; let r = 0; while (r < Math.max(w, h)) { const px = cx0 + r * Math.cos(t), py = cy0 + r * Math.sin(t); if (px < 0 || py < 0 || px >= w || py >= h) break; if (op(px, py)) break; r++ } rs.push(r); sx += cx0 + r * Math.cos(t); sy += cy0 + r * Math.sin(t) }
    rs.sort((p, q) => p - q); const hole = (rs[Math.floor(rs.length * 0.25)] + rs[Math.floor(rs.length * 0.5)]) / 2 / m   // robust hole radius in source pixels
    if (!hole || hole < 4) { setNote('Could not find a clear centre. Adjust by hand.'); return }
    const hx = sx / 90 / m, hy = sy / 90 / m; const nz = Math.min(3, Math.max(0.3, (PHOTO_R * 0.985) / (hole * k0)))
    setZ(nz); setOx(Math.max(-FRAME_OUT / 2, Math.min(FRAME_OUT / 2, -(hx - img.naturalWidth / 2) * k0 * nz))); setOy(Math.max(-FRAME_OUT / 2, Math.min(FRAME_OUT / 2, -(hy - img.naturalHeight / 2) * k0 * nz))); setNote('Auto-fitted to the photo circle ✓')
  }
  const reset = () => { setZ(1); setOx(0); setOy(0); setNote('') }
  const save = async () => {
    if (!img) return; setBusy(true); setErr('')
    try {
      const c = document.createElement('canvas'); c.width = c.height = FRAME_OUT; draw(c.getContext('2d')!, FRAME_OUT, false)
      const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Could not process the image'))), 'image/png'))
      await onDone(blob)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); setBusy(false) }
  }
  const Row = ({ label, v, set, lo, hi, step }: { label: string; v: number; set: (n: number) => void; lo: number; hi: number; step: number }) =>
    <label className="block text-xs text-gray-300 mt-1">{label}<input className="tpl-rng" type="range" min={lo} max={hi} step={step} value={v} onChange={e => set(Number(e.target.value))} /></label>
  return (
    <div className="crp-modal" role="dialog" aria-modal="true" aria-label="Fit ring to photo">
      <div className="crp-box glass">
        <div className="flex items-center justify-between mb-2"><b>Fit ring to the photo</b><button className="crp-x" onClick={onCancel} aria-label="Close" disabled={busy}>✕</button></div>
        {err && !img && <p className="text-amber-300 text-sm py-6 text-center">{err}</p>}
        {!img && !err && <p className="text-gray-400 text-sm py-10 text-center animate-pulse">Loading…</p>}
        {img && <>
          <div className="mx-auto rounded-xl overflow-hidden" style={{ width: P, height: P, background: 'repeating-conic-gradient(#2a2340 0% 25%, #1c1630 0% 50%) 50% / 20px 20px' }}><canvas ref={cv} style={{ width: P, height: P, display: 'block' }} /></div>
          <p className="text-[11px] text-gray-400 text-center mt-1">The dashed circle is where the member&apos;s round photo sits. The ring&apos;s inner edge should touch it.</p>
          <Row label={`Ring size: ${z.toFixed(2)}×`} v={z} set={setZ} lo={0.3} hi={3} step={0.01} />
          <Row label="Left ↔ Right" v={ox} set={setOx} lo={-FRAME_OUT / 4} hi={FRAME_OUT / 4} step={1} />
          <Row label="Up ↕ Down" v={oy} set={setOy} lo={-FRAME_OUT / 4} hi={FRAME_OUT / 4} step={1} />
          <div className="flex gap-2 flex-wrap mt-2"><button type="button" className="sym-btn !py-1 flex-1" onClick={autoFit}>✨ Auto-fit</button><button type="button" className="sym-btn !py-1" onClick={reset}>Reset</button>
            <label className="text-xs text-gray-300 flex items-center gap-1"><input type="checkbox" checked={guide} onChange={e => setGuide(e.target.checked)} />Guide</label></div>
          {note && <p className="text-emerald-300 text-xs mt-1 text-center">{note}</p>}
          {err && <p className="text-amber-300 text-xs mt-2 text-center">{err}</p>}
          <div className="flex gap-2 mt-3"><button className="sym-btn flex-1" onClick={onCancel} disabled={busy}>Cancel</button><button className="sym-btn ok flex-1" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Use this fit'}</button></div>
        </>}
      </div>
    </div>)
}
