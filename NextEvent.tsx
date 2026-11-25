import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { supabase } from './lib'

/** "Next Guild Event" card. Reads an optional `guild_events` table; if the table is missing or empty the card simply does not render, so nothing breaks. */
export function NextEvent() {
  const [ev, setEv] = useState<{ title: string; starts_at: string; link?: string } | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    let live = true
    supabase.from('guild_events').select('title,starts_at,link').gte('starts_at', new Date().toISOString()).order('starts_at').limit(1).maybeSingle()
      .then(r => { if (live && !r.error && r.data) setEv(r.data as any) }, () => {})
    const t = window.setInterval(() => setNow(Date.now()), 60000)
    return () => { live = false; window.clearInterval(t) }
  }, [])
  if (!ev) return null
  const ms = Math.max(0, new Date(ev.starts_at).getTime() - now)
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60
  const left = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  const cta = ev.link?.startsWith('http') ? <a className="ev-go" href={ev.link} target="_blank" rel="noreferrer">Join now</a> : <Link className="ev-go" to="/announcements">Join now</Link>
  return (
    <div className="ev-card">
      <CalendarDays size={30} aria-hidden="true" />
      <div className="ev-t"><small>Next guild event</small><b>{ev.title}</b><span>Starts in {left}</span></div>
      {cta}
    </div>
  )
}
