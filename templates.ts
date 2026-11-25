// The 10 premium profile templates. The look itself lives in templates.css (keyed by data-tpl); this file is the catalogue + helpers.
export type Fx = { on?: boolean; anim?: 'none' | 'shine' | 'float' | 'pulse'; font?: 'sans' | 'serif' | 'mono' | 'display' | 'script'; nameColor?: string; bgX?: number; bgY?: number; bgZ?: number; avX?: number; avY?: number; avZ?: number; frZ?: number }
export type Tpl = { id: string; name: string; blurb: string; accent: string }
export const TEMPLATES: Tpl[] = [
  { id: 'neon', name: 'Neon Gaming', blurb: 'Glowing grid, pulsing edge', accent: '#39ff88' },
  { id: 'luxury', name: 'Black Luxury', blurb: 'Brushed steel and a light sweep', accent: '#e5e7eb' },
  { id: 'gold', name: 'Golden Premium', blurb: 'Radiant gold rays', accent: '#fbbf24' },
  { id: 'cyber', name: 'Cyberpunk', blurb: 'Cyan and pink scanlines', accent: '#22d3ee' },
  { id: 'football', name: 'Football Athlete', blurb: 'Pitch stripes and floodlights', accent: '#22c55e' },
  { id: 'champion', name: 'Sports Champion', blurb: 'Stadium spotlights', accent: '#fbbf24' },
  { id: 'minimal', name: 'Minimal Pro', blurb: 'Clean, calm, professional', accent: '#e5e7eb' },
  { id: 'gradient', name: 'Animated Gradient', blurb: 'Flowing colour', accent: '#c084fc' },
  { id: 'glass', name: 'Dark Glass', blurb: 'Frosted glass over drifting colour', accent: '#a78bfa' },
  { id: 'royal', name: 'Royal Elite', blurb: 'Purple night, gold crown', accent: '#fbbf24' },
]
export const TPL = Object.fromEntries(TEMPLATES.map(t => [t.id, t])) as Record<string, Tpl>
export const ACCENTS = ['#39ff88', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#ef4444', '#f97316', '#fbbf24', '#e5e7eb']
export const FONTS: { id: NonNullable<Fx['font']>; label: string }[] = [{ id: 'sans', label: 'Modern' }, { id: 'serif', label: 'Classic' }, { id: 'mono', label: 'Tech' }, { id: 'display', label: 'Bold' }, { id: 'script', label: 'Script' }]
export const ANIMS: { id: NonNullable<Fx['anim']>; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'shine', label: 'Shine' }, { id: 'float', label: 'Float' }, { id: 'pulse', label: 'Pulse' }]

const HEX = /^#[0-9a-fA-F]{6}$/
export const isHex = (s?: string | null): s is string => !!s && HEX.test(s)
export const hexRgb = (h: string) => `${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)}`
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
/** Clean any stored fx so a bad value can never break the page. */
export const cleanFx = (f?: Fx | null): Fx => {
  const o = (f && typeof f === 'object' ? f : {}) as Fx; const r: Fx = {}
  if (o.on === false) r.on = false
  if (o.anim && ['none', 'shine', 'float', 'pulse'].includes(o.anim)) r.anim = o.anim
  if (o.font && ['sans', 'serif', 'mono', 'display', 'script'].includes(o.font)) r.font = o.font
  if (isHex(o.nameColor)) r.nameColor = o.nameColor
  for (const k of ['bgX', 'bgY', 'avX', 'avY'] as const) if (o[k] !== undefined) r[k] = num(o[k], 0, 100, 50)
  if (o.bgZ !== undefined) r.bgZ = num(o.bgZ, 1, 3, 1)
  if (o.avZ !== undefined) r.avZ = num(o.avZ, 0.6, 3, 1)   // photo size inside the frame (below 1 shrinks the photo)
  if (o.frZ !== undefined) r.frZ = num(o.frZ, 0.8, 1.3, 1)   // size of the frame artwork around the photo
  return r
}
