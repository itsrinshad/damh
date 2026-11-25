import { useEffect, useRef } from 'react'
import { WebField } from './WebField'
import { SITE_STYLES, useSiteStyle } from './siteStyle'
import { perfTier, usePrefs } from './prefs'

// One canvas, ten unique living backgrounds. Each effect draws only what it needs, runs at 30 fps on weak phones,
// pauses when the tab is hidden and uses no files or WebGL.
type Env = { g: CanvasRenderingContext2D; W: number; H: number; a: string; b: string; low: boolean }
type Step = (now: number, dt: number) => void
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const fill = (e: Env, c: string) => { e.g.fillStyle = c; e.g.fillRect(0, 0, e.W, e.H) }

const FX: Record<string, (e: Env) => Step> = {
  // 1 · Venom Rain: falling symbiote glyphs
  emerald: e => {
    const size = 16; let n = 0; let cols: number[] = []; let lw = 0; let acc = 0
    const chars = '01SYMBIOTE<>/\\|+*=ｱｲｳｴｵｶｷｸ'.split('')
    const init = () => { lw = e.W; n = Math.ceil(e.W / size); cols = Array.from({ length: n }, () => rnd(-e.H / size, 0)) }
    init()
    return (_n, dt) => {
      if (e.W !== lw) init()
      acc += dt; if (acc < (e.low ? 75 : 48)) return; acc = 0
      const g = e.g; fill(e, 'rgba(3,9,6,.17)'); g.font = size + 'px monospace'
      for (let i = 0; i < n; i++) {
        if (e.low && i % 2) continue
        const y = cols[i] * size; const x = i * size
        g.fillStyle = `rgba(${e.a},.5)`; g.fillText(chars[(Math.random() * chars.length) | 0], x, y - size)
        g.fillStyle = `rgba(${e.b},.95)`; g.fillText(chars[(Math.random() * chars.length) | 0], x, y)
        cols[i] += 1; if (y > e.H && Math.random() > 0.975) cols[i] = rnd(-24, 0)
      }
    }
  },
  // 2 · Inferno: rising embers over a flickering heat glow
  fire: e => {
    type P = { x: number; y: number; vx: number; vy: number; r: number; m: number }
    const mk = (init: boolean): P => ({ x: rnd(0, e.W), y: init ? rnd(0, e.H) : e.H + 10, vx: rnd(-0.2, 0.2), vy: -rnd(0.4, 1.5), r: rnd(0.8, 2.8), m: rnd(4, 9) })
    const ps = Array.from({ length: e.low ? 36 : 85 }, () => mk(true))
    return (now, dt) => {
      const g = e.g; g.globalCompositeOperation = 'source-over'; fill(e, '#0a0504')
      const fl = 0.55 + 0.1 * Math.sin(now * 0.004) + 0.06 * Math.sin(now * 0.011)
      const gl = g.createLinearGradient(0, e.H, 0, e.H * 0.35); gl.addColorStop(0, `rgba(${e.a},${0.5 * fl})`); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, e.H * 0.35, e.W, e.H * 0.65)
      g.globalCompositeOperation = 'lighter'
      for (const p of ps) {
        p.x += (p.vx + Math.sin(now * 0.002 + p.m) * 0.35) * dt * 0.06; p.y += p.vy * dt * 0.06
        if (p.y < -10) Object.assign(p, mk(false))
        const al = Math.max(0, Math.min(1, (p.y / e.H) * 1.3)); g.fillStyle = `rgba(${p.y > e.H * 0.55 ? e.a : e.b},${al})`
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill()
      }
      g.globalCompositeOperation = 'source-over'
    }
  },
  // 3 · Aurora Veil: slow ribbons of light over stars
  aurora: e => {
    const stars = Array.from({ length: e.low ? 28 : 64 }, () => ({ x: Math.random(), y: Math.random() * 0.65, p: Math.random() * 6 }))
    const cols = [e.a, e.b, '52,211,153', '96,165,250'].slice(0, e.low ? 3 : 4)
    return now => {
      const g = e.g; fill(e, '#04101a')
      for (const s of stars) { g.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * Math.abs(Math.sin(now * 0.0012 + s.p))})`; g.fillRect(s.x * e.W, s.y * e.H, 1.5, 1.5) }
      cols.forEach((c, i) => {
        const base = e.H * (0.2 + i * 0.09); const amp = e.H * (0.06 + i * 0.01); const h = e.H * 0.4; const step = e.low ? 30 : 16
        const gr = g.createLinearGradient(0, base - amp, 0, base + h); gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(0.25, `rgba(${c},.34)`); gr.addColorStop(1, `rgba(${c},0)`)
        g.fillStyle = gr; g.beginPath()
        for (let x = 0; x <= e.W + step; x += step) { const y = base + Math.sin(x * 0.004 + now * 0.0003 * (1 + i * 0.3) + i * 2) * amp + Math.sin(x * 0.011 - now * 0.0004 + i) * amp * 0.4; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y) }
        g.lineTo(e.W + step, base + h); g.lineTo(0, base + h); g.closePath(); g.fill()
      })
    }
  },
  // 4 · Warp Drive: stars streaming from the centre
  cosmic: e => {
    const st = Array.from({ length: e.low ? 70 : 150 }, () => ({ x: rnd(-1, 1), y: rnd(-1, 1), z: Math.random() }))
    return (_n, dt) => {
      const g = e.g; fill(e, 'rgba(8,6,28,.38)'); const cx = e.W / 2; const cy = e.H * 0.45; const sp = dt * 0.00026; const k = Math.max(e.W, e.H) * 0.35
      g.lineWidth = 1.2
      st.forEach((s, i) => {
        const pz = s.z; s.z -= sp
        if (s.z <= 0.03) { s.z = 1; s.x = rnd(-1, 1); s.y = rnd(-1, 1); return }
        g.strokeStyle = `rgba(${i % 3 === 0 ? e.b : '226,232,255'},${Math.min(1, 1.1 - s.z)})`
        g.beginPath(); g.moveTo(cx + (s.x / pz) * k, cy + (s.y / pz) * k); g.lineTo(cx + (s.x / s.z) * k, cy + (s.y / s.z) * k); g.stroke()
      })
    }
  },
  // 5 · Frostbite: snow and ice crystals
  ice: e => {
    const fl = Array.from({ length: e.low ? 44 : 100 }, () => ({ x: rnd(0, 1), y: rnd(0, 1), r: rnd(0.8, 3.2), v: rnd(0.3, 1), p: rnd(0, 6) }))
    return (now, dt) => {
      const g = e.g; const bg = g.createLinearGradient(0, 0, 0, e.H); bg.addColorStop(0, '#050d18'); bg.addColorStop(1, '#0b2238'); g.fillStyle = bg; g.fillRect(0, 0, e.W, e.H)
      const fr = g.createLinearGradient(0, e.H, 0, e.H * 0.7); fr.addColorStop(0, `rgba(${e.a},.22)`); fr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fr; g.fillRect(0, e.H * 0.7, e.W, e.H * 0.3)
      g.strokeStyle = 'rgba(220,240,255,.75)'; g.lineWidth = 0.8
      for (const f of fl) {
        f.y += f.v * dt * 0.00005 * (1 + f.r * 0.4); f.p += dt * 0.0006; if (f.y > 1.03) { f.y = -0.03; f.x = Math.random() }
        const x = (f.x + Math.sin(f.p) * 0.02) * e.W; const y = f.y * e.H
        if (f.r > 2.3) { g.beginPath(); for (let k = 0; k < 3; k++) { const a = f.p * 0.6 + (k * Math.PI) / 3; g.moveTo(x - Math.cos(a) * f.r * 2, y - Math.sin(a) * f.r * 2); g.lineTo(x + Math.cos(a) * f.r * 2, y + Math.sin(a) * f.r * 2) } g.stroke() }
        else { g.fillStyle = `rgba(255,255,255,${0.35 + f.r * 0.18})`; g.beginPath(); g.arc(x, y, f.r, 0, 7); g.fill() }
      }
      void now
    }
  },
  // 6 · Neon Grid: synthwave sun over a moving road
  cyber: e => now => {
    const g = e.g; const hz = e.H * 0.52; const cx = e.W / 2
    const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#09051a'); sky.addColorStop(1, `rgba(${e.a},.38)`); g.fillStyle = sky; g.fillRect(0, 0, e.W, hz)
    const r = Math.min(e.W, e.H) * 0.2; const sun = g.createLinearGradient(0, hz - r * 2, 0, hz); sun.addColorStop(0, `rgb(${e.b})`); sun.addColorStop(1, `rgb(${e.a})`)
    g.fillStyle = sun; g.beginPath(); g.arc(cx, hz - r * 0.9, r, 0, 7); g.fill()
    g.fillStyle = '#0d0624'; for (let i = 0; i < 6; i++) g.fillRect(cx - r, hz - r * 0.9 + r * 0.12 + i * r * 0.14, r * 2, 1.5 + i * 1.3)
    g.fillStyle = '#07030f'; g.fillRect(0, hz, e.W, e.H - hz)
    g.lineWidth = 1; const n = e.low ? 9 : 14; const off = (now * 0.00035) % 1
    for (let i = 0; i < n; i++) { const t = (i + off) / n; const y = hz + (e.H - hz) * t * t; g.strokeStyle = `rgba(${e.a},${0.15 + t * 0.6})`; g.beginPath(); g.moveTo(0, y); g.lineTo(e.W, y); g.stroke() }
    const v = e.low ? 8 : 12; g.strokeStyle = `rgba(${e.b},.28)`; g.beginPath()
    for (let i = -v; i <= v; i++) { g.moveTo(cx + i * e.W * 0.025, hz); g.lineTo(cx + i * e.W * 0.22, e.H) } g.stroke()
    const glow = g.createLinearGradient(0, hz - 6, 0, hz + 22); glow.addColorStop(0, `rgba(${e.b},.5)`); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, hz - 6, e.W, 28)
  },
  // 7 · Sakura Night: petals in the wind
  sakura: e => {
    type P = { x: number; y: number; s: number; rot: number; vr: number; vx: number; vy: number; ph: number; c: string }
    const mk = (init: boolean): P => ({ x: rnd(-0.1, 1.1) * e.W, y: init ? rnd(0, e.H) : -20, s: rnd(4.5, 9), rot: rnd(0, 6), vr: rnd(-0.003, 0.003), vx: rnd(0.2, 0.7), vy: rnd(0.35, 0.95), ph: rnd(0, 6), c: Math.random() > 0.5 ? e.a : e.b })
    const ps = Array.from({ length: e.low ? 18 : 38 }, () => mk(true))
    return (now, dt) => {
      const g = e.g; const bg = g.createLinearGradient(0, 0, 0, e.H); bg.addColorStop(0, '#0d050c'); bg.addColorStop(1, '#2a0d24'); g.fillStyle = bg; g.fillRect(0, 0, e.W, e.H)
      for (const p of ps) {
        p.x += (p.vx + Math.sin(now * 0.001 + p.ph) * 0.4) * dt * 0.06; p.y += p.vy * dt * 0.06; p.rot += p.vr * dt
        if (p.y > e.H + 20 || p.x > e.W + 30) Object.assign(p, mk(false))
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = `rgba(${p.c},.72)`; g.beginPath(); g.ellipse(0, 0, p.s, p.s * (0.5 + 0.25 * Math.sin(now * 0.002 + p.ph)), 0, 0, 7); g.fill(); g.restore()
      }
    }
  },
  // 8 · Thunderstorm: slanted rain and lightning
  midnight: e => {
    const rain = Array.from({ length: e.low ? 55 : 130 }, () => ({ x: rnd(0, 1.2), y: rnd(0, 1), l: rnd(10, 26), v: rnd(0.6, 1.3) }))
    let flash = 0; let next = 2500; let bolt: [number, number][] = []
    const strike = () => { let x = rnd(0.15, 0.85) * e.W; let y = 0; bolt = [[x, y]]; while (y < e.H * rnd(0.45, 0.8)) { x += rnd(-38, 38); y += rnd(22, 48); bolt.push([x, y]) } flash = 1 }
    return (_n, dt) => {
      const g = e.g; const bg = g.createLinearGradient(0, 0, 0, e.H); bg.addColorStop(0, '#040812'); bg.addColorStop(1, '#0a1630'); g.fillStyle = bg; g.fillRect(0, 0, e.W, e.H)
      next -= dt; if (next < 0) { strike(); next = rnd(3500, 9000) }
      if (flash > 0.02) { g.fillStyle = `rgba(190,215,255,${flash * 0.22})`; g.fillRect(0, 0, e.W, e.H); g.strokeStyle = `rgba(235,245,255,${flash})`; g.lineWidth = 2; g.beginPath(); bolt.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke(); flash *= Math.pow(0.5, dt / 90) }
      g.strokeStyle = `rgba(${e.b},.35)`; g.lineWidth = 1; g.beginPath()
      for (const r of rain) { r.y += r.v * dt * 0.0009; r.x -= r.v * dt * 0.00018; if (r.y > 1.05) { r.y = -0.05; r.x = rnd(0, 1.2) } const x = r.x * e.W; const y = r.y * e.H; g.moveTo(x, y); g.lineTo(x - r.l * 0.22, y + r.l) }
      g.stroke()
    }
  },
  // 9 · Royal Gold: gold dust and slow rays
  royal: e => {
    const m = Array.from({ length: e.low ? 38 : 90 }, () => ({ x: Math.random(), y: Math.random(), z: rnd(0.3, 1), p: rnd(0, 6) }))
    return (now, dt) => {
      const g = e.g; fill(e, '#0a0618'); const cx = e.W / 2
      const gl = g.createRadialGradient(cx, 0, 0, cx, 0, Math.max(e.W, e.H) * 0.85); gl.addColorStop(0, 'rgba(251,191,36,.28)'); gl.addColorStop(0.5, `rgba(${e.a},.12)`); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, e.W, e.H)
      g.fillStyle = 'rgba(251,191,36,.045)'
      for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + Math.sin(now * 0.00015 + i * 1.3) * 0.5 + (i - 3) * 0.17; const w = 0.05; g.beginPath(); g.moveTo(cx, -10); g.lineTo(cx + Math.cos(a - w) * e.H * 1.5, Math.sin(a - w) * e.H * 1.5); g.lineTo(cx + Math.cos(a + w) * e.H * 1.5, Math.sin(a + w) * e.H * 1.5); g.fill() }
      g.globalCompositeOperation = 'lighter'
      for (const s of m) { s.y -= dt * 0.000012 * s.z; if (s.y < -0.02) { s.y = 1.02; s.x = Math.random() } const tw = 0.3 + 0.7 * Math.abs(Math.sin(now * 0.0016 + s.p)); g.fillStyle = `rgba(253,224,130,${tw * s.z})`; g.fillRect((s.x + Math.sin(now * 0.0003 + s.p) * 0.01) * e.W, s.y * e.H, 1 + s.z * 1.6, 1 + s.z * 1.6) }
      g.globalCompositeOperation = 'source-over'
    }
  },
}

export function FxCanvas({ id, cls = 'f3d' }: { id: string; cls?: string }) {
  const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = cv.current!; const g = canvas.getContext('2d', { alpha: false }); const make = FX[id]; if (!g || !make) return
    const s = SITE_STYLES.find(x => x.id === id) ?? SITE_STYLES[0]; const low = perfTier() === 'low'
    const reduce = !!matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const env: Env = { g, W: 0, H: 0, a: rgb(s.a), b: rgb(s.b), low }
    let step: Step = () => {}; let raf = 0; let last = 0; let visible = true
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, low ? 1 : 1.5); env.W = canvas.clientWidth || innerWidth; env.H = canvas.clientHeight || innerHeight
      canvas.width = Math.round(env.W * dpr); canvas.height = Math.round(env.H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.fillStyle = '#05060a'; g.fillRect(0, 0, env.W, env.H); step = make(env)
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize()
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting }); io.observe(canvas)
    const gap = low ? 33 : 16
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) { last = now; return }
      if (now - last < gap) return
      const dt = Math.min(60, now - (last || now)); last = now; step(now, dt)
    }
    if (reduce) { for (let i = 0; i < 90; i++) step(i * 16, 16) } else raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [id])
  return <canvas ref={cv} className={cls} aria-hidden="true" />
}

const wrapHtml = (h: string) => /<html|<!doctype/i.test(h) ? h
  : !h.includes('<') ? `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:#05060a}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="c"></canvas><script>${h}<\/script></body></html>`
  : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:#05060a}</style></head><body>${h}</body></html>`

/** The admin's pasted effect. It runs inside a sandboxed frame (scripts allowed, but NO access to the site, logins or data). */
export function CustomFx({ html }: { html: string }) {
  return <iframe className="fx-frame" title="Custom effect" aria-hidden="true" tabIndex={-1} sandbox="allow-scripts" srcDoc={wrapHtml(html)} />
}

/** The animated background behind every member page. It follows the admin's choice live. */
export function SiteFx() {
  const { id, custom } = useSiteStyle(); const p = usePrefs()
  if (p.lite) return null
  if (custom.enabled && custom.html.trim()) return <CustomFx html={custom.html} />
  if (id === 'web') return <WebField dim />
  return <FxCanvas key={id} id={id} />
}
