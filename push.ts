// Phone notifications (Web Push). Needs the public VAPID key in public/config.js (window.__SYM_PUSH__) and the send-push Edge Function.
import { supabase } from './lib'

const vapid = (): string => (window as any).__SYM_PUSH__ ?? import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''
const b64 = (s: string) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))) }
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
export const pushConfigured = () => !!vapid()

export async function pushState(): Promise<'unsupported' | 'unconfigured' | 'denied' | 'on' | 'off'> {
  if (!pushSupported()) return 'unsupported'; if (!pushConfigured()) return 'unconfigured'; if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration('/'); const sub = await reg?.pushManager.getSubscription(); return sub && Notification.permission === 'granted' ? 'on' : 'off'
}
export async function enablePush(): Promise<string | null> {
  try {
    if (!pushSupported()) return 'This browser cannot show phone notifications.'
    if (!pushConfigured()) return 'Phone notifications are not set up on the server yet (admin: add the VAPID key).'
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return 'Notifications were blocked. Allow them in your phone or browser settings, then try again.'
    const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapid()) })
    const j = sub.toJSON(); const r = await supabase.rpc('push_save', { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_ua: navigator.userAgent.slice(0, 120) })
    return r.error ? r.error.message : null
  } catch (e) { return (e as Error).message }
}
export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/'); const sub = await reg?.pushManager.getSubscription()
  if (sub) { await supabase.rpc('push_remove', { p_endpoint: sub.endpoint }); await sub.unsubscribe() }
}
