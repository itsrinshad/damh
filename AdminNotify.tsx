// Admin: send a notification to everyone, a group, or chosen players. It appears in the bell and (if they turned it on) on their phone.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'

type Mem = { id: string; username: string; display_name: string | null }
type Row = { id: string; title: string; body: string | null; audience: string; sent_count: number; created_at: string }
const AUD: [string, string][] = [['all', 'Everyone'], ['members', 'Members only'], ['admins', 'Admins only'], ['selected', 'Chosen players']]

export function AdminNotify() {
  const [aud, setAud] = useState('all'); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [link, setLink] = useState('')
  const [q, setQ] = useState(''); const [found, setFound] = useState<Mem[]>([]); const [pick, setPick] = useState<Mem[]>([]); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [hist, setHist] = useState<Row[]>([])
  const loadH = useCallback(() => { supabase.from('admin_broadcasts').select('id,title,body,audience,sent_count,created_at').order('created_at', { ascending: false }).limit(20).then(r => setHist((r.data ?? []) as Row[])) }, [])
  useEffect(() => { loadH() }, [loadH])
  useEffect(() => { if (aud !== 'selected' || q.trim().length < 2) { setFound([]); return }; const t = setTimeout(() => { supabase.from('profiles').select('id,username,display_name').eq('status', 'active').or(`username.ilike.%${q.replace(/[%,()]/g, '')}%,display_name.ilike.%${q.replace(/[%,()]/g, '')}%`).limit(8).then(r => setFound((r.data ?? []) as Mem[])) }, 250); return () => clearTimeout(t) }, [q, aud])
  const send = async () => {
    if (title.trim().length < 2) return setMsg('Write a title.'); if (aud === 'selected' && !pick.length) return setMsg('Choose at least one player.')
    if (!confirm(`Send “${title.trim()}” to ${aud === 'selected' ? pick.length + ' player(s)' : AUD.find(a => a[0] === aud)![1].toLowerCase()}?`)) return
    setBusy(true); setMsg(''); const r = await supabase.rpc('admin_notify', { p_title: title.trim(), p_body: body.trim() || null, p_link: link.trim() || null, p_audience: aud, p_users: aud === 'selected' ? pick.map(p => p.id) : null }); setBusy(false)
    if (r.error) return setMsg('❌ ' + r.error.message + (/does not exist|schema cache|function/i.test(r.error.message) ? ' (run SYMBIOTES_PHASE12.sql)' : ''))
    setMsg(`✅ Sent to ${r.data} player${r.data === 1 ? '' : 's'}.`); setTitle(''); setBody(''); setLink(''); setPick([]); loadH()
  }
  return (
    <div className="space-y-3 pb-10">
      <div className="flex items-center gap-2"><h2 className="text-xl font-bold">🔔 Send notification</h2><span className="ml-auto" /><Link to="/admin" className="sym-btn !py-1 text-sm">Admin</Link></div>
      <section className="glass p-3 space-y-2">
        <div className="flex flex-wrap gap-2">{AUD.map(([id, l]) => <button key={id} className={'sym-btn !py-1 text-sm ' + (aud === id ? '' : 'opacity-60')} onClick={() => setAud(id)}>{l}</button>)}</div>
        {aud === 'selected' && <div className="space-y-1">
          <input className="sym-inp" placeholder="Search a player…" value={q} onChange={e => setQ(e.target.value)} />
          {found.filter(f => !pick.some(p => p.id === f.id)).map(f => <button key={f.id} className="sym-btn !py-1 text-sm mr-1" onClick={() => { setPick([...pick, f]); setQ('') }}>+ {f.display_name || f.username}</button>)}
          <div className="flex flex-wrap gap-1">{pick.map(p => <button key={p.id} className="sym-btn ok !py-0.5 text-xs" onClick={() => setPick(pick.filter(x => x.id !== p.id))}>{p.display_name || p.username} ✕</button>)}</div></div>}
        <input className="sym-inp" placeholder="Title (e.g. Weekend event starts!)" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="sym-inp" rows={3} placeholder="Message (optional)" maxLength={300} value={body} onChange={e => setBody(e.target.value)} />
        <input className="sym-inp" placeholder="Open this page when tapped (optional), e.g. /quests" maxLength={120} value={link} onChange={e => setLink(e.target.value)} />
        <button className="sym-btn w-full" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send notification'}</button>
        <p className="text-[11px] text-gray-500">It always appears in the bell. Players who turned on phone notifications also get it on their phone.</p>
      </section>
      {msg && <p className="text-amber-300 text-sm" role="status">{msg}</p>}
      <section className="space-y-2"><b>History</b>{hist.map(h => <div key={h.id} className="glass p-3 text-sm"><b>{h.title}</b>{h.body && <p className="text-gray-400 text-xs mt-1">{h.body}</p>}<p className="text-[11px] text-gray-500 mt-1">{h.audience} · delivered to {h.sent_count} · {new Date(h.created_at).toLocaleString()}</p></div>)}{!hist.length && <p className="text-sm text-gray-400">Nothing sent yet.</p>}</section>
    </div>)
}
