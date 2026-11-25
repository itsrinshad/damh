// Automatic bug reporting. Crashes and unexpected errors are sent (grouped, rate-limited) to Admin → Bugs.
// Nothing is sent for logged-out visitors, and no passwords, messages or personal data are collected: only the error text,
// the page path, the browser name and the screen size.
import { supabase } from './lib'

const IGNORE = /ResizeObserver loop|^Script error\.?$|AbortError|Failed to fetch|NetworkError|Load failed|ChunkLoadError|Importing a module script failed|The operation was aborted/i
const sentAt = new Map<string, number>(); let sentTotal = 0; const recent: string[] = []
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
const ctx = () => ({ page: location.pathname, ua: navigator.userAgent.slice(0, 240), screen: `${innerWidth}x${innerHeight}@${devicePixelRatio}` })
export const recentErrors = () => recent.slice()

async function send(kind: 'auto' | 'manual', message: string, stack: string, sig: string, note = '') {
  try {
    const { data } = await supabase.auth.getSession(); if (!data.session) return false
    const { error } = await supabase.rpc('report_bug', { p_kind: kind, p_sig: sig, p_message: message.slice(0, 500), p_stack: stack.slice(0, 4000), p_note: note.slice(0, 1000), ...(({ page, ua, screen }) => ({ p_page: page, p_ua: ua, p_screen: screen }))(ctx()) })
    return !error
  } catch { return false }
}

/** Report an error automatically (same error at most once per 10 minutes on this device, 12 per visit). */
export function reportError(err: unknown, source = 'js') {
  try {
    const e = err as any; const message = String(e?.message ?? e ?? 'Unknown error'); if (!message || IGNORE.test(message)) return
    const stack = String(e?.stack ?? '').split('\n').slice(0, 12).join('\n')
    recent.push(message.slice(0, 160)); if (recent.length > 5) recent.shift()
    const sig = hash(source + message.slice(0, 120) + (stack.split('\n')[1] ?? '')); const now = Date.now()
    if (sentTotal >= 12 || now - (sentAt.get(sig) ?? 0) < 600000) return
    sentAt.set(sig, now); sentTotal++
    void send('auto', `[${source}] ${message}`, stack, sig)
  } catch { /* never let the reporter itself crash the app */ }
}

/** Member pressed "Report a bug". Includes the last errors seen on this device automatically. */
export const submitBug = (text: string) => send('manual', text.trim().slice(0, 200) || 'Bug report', recent.join('\n'), 'manual-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text.trim())

let started = false
export function startBugCapture() {
  if (started) return; started = true
  window.addEventListener('error', ev => { if (ev.message) reportError(ev.error ?? ev.message, 'js') })
  window.addEventListener('unhandledrejection', ev => reportError(ev.reason, 'promise'))
}
