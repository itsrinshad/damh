// 10 live (canvas) profile backgrounds. They only animate while the card is on screen and "play" is on; otherwise one still frame is drawn.
import { useEffect, useRef } from 'react'
import { perfTier } from './prefs'

export const LIVE_THEMES = [
  { id: 'eclipse', name: 'Crimson Eclipse', rarity: 'legendary', desc: 'A black sun with a blood-red corona and drifting smoke.' },
  { id: 'ember', name: 'Volcanic Embers', rarity: 'epic', desc: 'Glowing embers rising from a molten sky.' },
  { id: 'abyssal', name: 'Abyssal Lightning', rarity: 'epic', desc: 'Deep blue storm with sudden lightning.' },
  { id: 'dragon', name: 'Imperial Gold Aura', rarity: 'legendary', desc: 'Golden god-rays and floating sparks.' },
  { id: 'frost', name: 'Glacial Blizzard', rarity: 'epic', desc: 'Icy light and drifting snow.' },
  { id: 'void', name: 'Shadow Void', rarity: 'legendary', desc: 'A singularity pulling violet light into the dark.' },
  { id: 'emerald', name: 'Emerald Spirit', rarity: 'epic', desc: 'Green aurora ribbons over a dark forest night.' },
  { id: 'nebula', name: 'Cosmic Nebula', rarity: 'epic', desc: 'Pink and blue nebula clouds.' },
  { id: 'sakura', name: 'Midnight Sakura', rarity: 'rare', desc: 'A pale moon and falling petals.' },
  { id: 'bloodmoon', name: 'Blood Moon Mist', rarity: 'epic', desc: 'A red moon behind rolling fog.' },
] as const
export const liveCode = (id: string) => 'bd_live_' + id
const W = 390, H = 430
type P = { x: number; y: number; z: number; vx: number; vy: number; phase: number; size: number }

function cloud(c: CanvasRenderingContext2D, x: number, y: number, r: number, c1: string, c2: string) {
  const g = c.createRadialGradient(x, y, r * 0.05, x, y, r); g.addColorStop(0, c1); g.addColorStop(0.55, c2); g.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill()
}
const PCOL: Record<string, string> = { eclipse: '248,113,113', bloodmoon: '248,113,113', abyssal: '125,211,252', frost: '125,211,252', void: '216,180,254', nebula: '216,180,254', emerald: '110,231,183', sakura: '253,164,175' }

export function LiveBg({ theme, play = true }: { theme: string; play?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const c = cv.getContext('2d'); if (!c) return
    const low = perfTier() === 'low'; const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const n = Math.round((theme === 'frost' ? 95 : theme === 'sakura' ? 45 : 75) * (low ? 0.4 : 1))
    const ps: P[] = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 1.4, vx: (Math.random() - 0.5) * 0.7, vy: (Math.random() - 0.5) * 0.7, phase: Math.random() * 6.283, size: 1 + Math.random() * 2.8 }))
    let tick = 0, bolt = 0, pts: { x: number; y: number }[] = [], raf = 0, visible = true, last = 0
    const frame = () => {
      tick += 0.016; c.globalCompositeOperation = 'source-over'
      const bg = (col: string) => { c.fillStyle = col; c.fillRect(0, 0, W, H) }
      if (theme === 'eclipse') {
        bg('#090305'); const pulse = Math.sin(tick * 1.5) * 4, ex = 275, ey = 105, er = 54
        cloud(c, ex + Math.sin(tick * 0.6) * 8, ey, 165 + pulse, 'rgba(220,38,38,.55)', 'rgba(127,29,29,.18)'); cloud(c, 120 + Math.cos(tick * 0.4) * 20, 220, 190, 'rgba(153,27,27,.28)', 'rgba(0,0,0,0)')
        const rim = c.createRadialGradient(ex, ey, er - 2, ex, ey, er + 14 + pulse * 0.5); rim.addColorStop(0, '#fff1f2'); rim.addColorStop(0.35, '#ef4444'); rim.addColorStop(1, 'rgba(220,38,38,0)')
        c.fillStyle = rim; c.beginPath(); c.arc(ex, ey, er + 16, 0, 6.283); c.fill(); c.fillStyle = '#050203'; c.beginPath(); c.arc(ex, ey, er, 0, 6.283); c.fill()
        cloud(c, ex - 25 + Math.sin(tick * 0.7) * 18, ey + 15, 65, 'rgba(10,4,6,.85)', 'rgba(10,4,6,0)')
      } else if (theme === 'ember') { bg('#0c0502'); cloud(c, W * 0.5, H * 0.95, 280, 'rgba(234,88,12,.45)', 'rgba(124,45,18,.12)'); cloud(c, 260 + Math.sin(tick * 0.8) * 30, 140, 160, 'rgba(245,158,11,.22)', 'rgba(0,0,0,0)') }
      else if (theme === 'abyssal') {
        bg('#030814'); cloud(c, 260, 110, 210, 'rgba(14,165,233,.35)', 'rgba(30,58,138,.12)'); bolt--
        if (bolt <= 0 && Math.random() < 0.04) { pts = []; let x = 220 + Math.random() * 120, y = 0; pts.push({ x, y }); while (y < H * 0.72) { x += (Math.random() - 0.5) * 44; y += 16 + Math.random() * 24; pts.push({ x, y }) } bolt = 14 }
        if (bolt > 0 && pts.length) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(125,211,252,${bolt / 14})`; c.lineWidth = 2.2; c.shadowColor = '#38bdf8'; c.shadowBlur = low ? 0 : 18; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); c.restore() }
      } else if (theme === 'dragon') {
        bg('#0a0702'); c.save(); c.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 4; i++) { const g = c.createLinearGradient(W, 0, 40, H); g.addColorStop(0, 'rgba(253,224,71,.14)'); g.addColorStop(1, 'rgba(245,158,11,0)'); c.fillStyle = g; const s = Math.sin(tick * 0.5 + i) * 6; c.beginPath(); c.moveTo(W, -20); c.lineTo(W - 80 - i * 45 + s, 0); c.lineTo(20 + i * 35, H); c.lineTo(140 + i * 45, H); c.closePath(); c.fill() }
        c.restore(); cloud(c, 260, 120, 180, 'rgba(245,158,11,.3)', 'rgba(0,0,0,0)')
      } else if (theme === 'frost') { bg('#040d14'); cloud(c, 250 + Math.sin(tick * 0.5) * 25, 100, 220, 'rgba(56,189,248,.32)', 'rgba(8,51,68,.1)'); cloud(c, 100, 260, 180, 'rgba(165,243,252,.16)', 'rgba(0,0,0,0)') }
      else if (theme === 'void') {
        bg('#07030d'); const vx = 265, vy = 120; c.save(); c.translate(vx, vy); c.rotate(tick * 0.4); cloud(c, 0, 0, 165, 'rgba(147,51,234,.45)', 'rgba(59,7,100,.12)')
        c.strokeStyle = 'rgba(216,180,254,.35)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 78, 28, 0.3, 0, 6.283); c.stroke(); c.restore(); c.fillStyle = '#030106'; c.beginPath(); c.arc(vx, vy, 34, 0, 6.283); c.fill()
      } else if (theme === 'emerald') {
        bg('#030b07'); c.save(); c.globalCompositeOperation = 'lighter'
        for (let l = 0; l < 2; l++) { const g = c.createLinearGradient(0, 40, W, 220); g.addColorStop(0, 'rgba(16,185,129,0)'); g.addColorStop(0.5, 'rgba(52,211,153,.22)'); g.addColorStop(1, 'rgba(5,150,105,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 140); for (let x = 0; x <= W; x += 20) c.lineTo(x, 110 + l * 45 + Math.sin(x * 0.015 + tick * 1.3 + l) * 28); c.lineTo(W, 260); c.lineTo(0, 260); c.closePath(); c.fill() }
        c.restore()
      } else if (theme === 'nebula') { bg('#06040f'); cloud(c, 250 + Math.cos(tick * 0.4) * 20, 110, 190, 'rgba(236,72,153,.35)', 'rgba(0,0,0,0)'); cloud(c, 130 + Math.sin(tick * 0.5) * 20, 190, 200, 'rgba(59,130,246,.32)', 'rgba(0,0,0,0)') }
      else if (theme === 'sakura') {
        bg('#0c0408'); cloud(c, 270, 95, 150, 'rgba(251,113,133,.32)', 'rgba(136,19,55,.1)'); c.fillStyle = 'rgba(255,228,230,.85)'; c.shadowColor = '#fb7185'; c.shadowBlur = low ? 0 : 25; c.beginPath(); c.arc(280, 90, 32, 0, 6.283); c.fill(); c.shadowBlur = 0
      } else if (theme === 'bloodmoon') {
        bg('#080202'); const mx = 265, my = 110; cloud(c, mx, my, 180, 'rgba(185,28,28,.48)', 'rgba(69,10,10,.15)')
        const g = c.createRadialGradient(mx - 12, my - 12, 5, mx, my, 46); g.addColorStop(0, '#fca5a5'); g.addColorStop(0.6, '#dc2626'); g.addColorStop(1, '#7f1d1d'); c.fillStyle = g; c.beginPath(); c.arc(mx, my, 46, 0, 6.283); c.fill()
        cloud(c, 150 + Math.sin(tick * 0.6) * 45, 155, 130, 'rgba(15,4,4,.72)', 'rgba(15,4,4,0)')
      } else bg('#07070b')
      // depth particles
      c.save(); c.globalCompositeOperation = 'lighter'
      for (const p of ps) {
        if (theme === 'eclipse' || theme === 'ember' || theme === 'dragon') { p.y -= 0.6 + p.z * 0.9; p.x += Math.sin(tick * 2 + p.phase) * 0.45 * p.z; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W } }
        else if (theme === 'frost' || theme === 'sakura') { p.y += 0.5 + p.z * 0.8; p.x += Math.sin(tick * 1.5 + p.phase) * 0.8 * p.z; if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W } }
        else if (theme === 'void') { const dx = 265 - p.x, dy = 120 - p.y, d = Math.hypot(dx, dy) || 1; p.x += (dx / d) * 0.6 - (dy / d) * 1.1; p.y += (dy / d) * 0.6 + (dx / d) * 1.1; if (d < 32) { p.x = Math.random() * W; p.y = Math.random() * H } }
        else { p.x += p.vx * p.z; p.y += p.vy * p.z; if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0 }
        const fl = 0.45 + 0.55 * Math.sin(tick * 4 + p.phase), r = p.size * p.z, col = `rgba(${PCOL[theme] ?? '251,191,36'},${fl})`
        if (p.z > 1.25) { const b = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4); b.addColorStop(0, col); b.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = b; c.beginPath(); c.arc(p.x, p.y, r * 2.4, 0, 6.283); c.fill() }
        else if (theme === 'sakura') { c.save(); c.translate(p.x, p.y); c.rotate(tick * 2 + p.phase); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r * 1.8, r * 0.9, 0, 0, 6.283); c.fill(); c.restore() }
        else { c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, r, 0, 6.283); c.fill() }
      }
      c.restore()
    }
    const loop = (t: number) => { raf = requestAnimationFrame(loop); if (!visible) return; if (low && t - last < 50) return; last = t; frame() }   // weak phones: ~20 fps
    frame()   // always one still frame
    const animate = play && !reduce
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(e => { visible = e[0].isIntersecting }) : null; io?.observe(cv)
    const vis = () => { visible = !document.hidden }; document.addEventListener('visibilitychange', vis)
    if (animate) raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); io?.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [theme, play])
  return <canvas ref={ref} className="bd-media bd-live" width={W} height={H} aria-hidden="true" />
}
