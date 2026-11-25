import { useEffect, useState } from 'react'
import { supabase } from './lib'

/** Admin: add or remove guild events. They show on Home as "Next guild event". */
export function AdminEvents() {
  const [rows, setRows] = useState<any[]>([]); const [title, setTitle] = useState(''); const [at, setAt] = useState(''); const [link, setLink] = useState(''); const [msg, setMsg] = useState('')
  const load = () => supabase.from('guild_events').select('*').order('starts_at').then(r => { if (r.error) setMsg(r.error.message + ' (run 17_SYMBIOTES_PHASE17_EVENTS.sql first)'); else setRows(r.data ?? []) })
  useEffect(() => { load() }, [])
  const add = async () => {
    if (!title.trim() || !at) { setMsg('Add a title and a start time.'); return }
    const { error } = await supabase.from('guild_events').insert({ title: title.trim(), starts_at: new Date(at).toISOString(), link: link.trim() || null })
    if (error) setMsg(error.message); else { setTitle(''); setAt(''); setLink(''); setMsg('Event added.'); load() }
  }
  const del = async (id: string) => { await supabase.from('guild_events').delete().eq('id', id); load() }
  return (
    <div className="space-y-3">
      <h1 className="h1">Guild events</h1>
      <div className="glass p-3">
        <input className="sym-inp" placeholder="Event title (e.g. Shadow War)" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} />
        <input className="sym-inp" type="datetime-local" value={at} onChange={e => setAt(e.target.value)} />
        <input className="sym-inp" placeholder="Join link (optional, https://…)" value={link} onChange={e => setLink(e.target.value)} />
        <button className="sym-btn" onClick={add}>Add event</button>
        {msg && <p className="text-xs text-gray-300 mt-2">{msg}</p>}
      </div>
      <div className="glass p-3">
        {!rows.length ? <p className="text-sm text-gray-400">No events yet.</p> : rows.map(e => (
          <div key={e.id} className="row"><span><b>{e.title}</b><br /><small className="text-gray-400">{new Date(e.starts_at).toLocaleString()}</small></span><button className="sym-btn danger !min-h-[36px]" onClick={() => del(e.id)}>Delete</button></div>))}
      </div>
    </div>)
}
