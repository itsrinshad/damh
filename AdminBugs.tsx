import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib'
import { timeAgo } from './Social'

const ST: Record<string, string> = { new: '🔴 New', seen: '👀 Seen', fixing: '🛠 Fixing', fixed: '✅ Fixed', ignored: '⚫ Ignored' }

/** Admin → Bugs: automatic crash reports and member reports, grouped with a counter. */
export function AdminBugs() {
  const [rows, setRows] = useState<any[] | null>(null); const [f, setF] = useState('open'); const [err, setErr] = useState('')
  const load = useCallback(() => { supabase.from('bug_reports').select('*').order('last_seen', { ascending: false }).limit(200).then((r: any) => { if (r.error) setErr(r.error.message + ' (run 18_SYMBIOTES_PHASE18_BUGS.sql first)'); else setRows(r.data ?? []) }) }, [])
  useEffect(() => { load() }, [load])
  const set = async (id: string, status: string) => { setRows(rs => (rs ?? []).map(x => x.id === id ? { ...x, status } : x)); await supabase.from('bug_reports').update({ status }).eq('id', id) }
  const del = async (id: string) => { setRows(rs => (rs ?? []).filter(x => x.id !== id)); await supabase.from('bug_reports').delete().eq('id', id) }
  const list = (rows ?? []).filter(x => f === 'all' || (f === 'open' ? ['new', 'seen', 'fixing'].includes(x.status) : x.status === f))
  const newCount = (rows ?? []).filter(x => x.status === 'new').length
  return (
    <div className="space-y-3">
      <h1 className="h1">Bug reports</h1>
      <p className="text-sm text-gray-400">Crashes are reported automatically. The same error is grouped into one card with a counter. {newCount > 0 && <b className="text-amber-300">{newCount} new</b>}</p>
      <div className="seg">{['open', 'new', 'fixed', 'ignored', 'all'].map(k => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{k}</button>)}</div>
      {err && <p className="glass p-3 text-amber-300 text-sm">{err}</p>}
      {!rows && !err && <p className="text-center text-gray-400 animate-pulse">Loading…</p>}
      {rows && !list.length && <p className="text-center text-gray-400 text-sm">Nothing here 🎉</p>}
      {list.map(b => (
        <div key={b.id} className="glass p-3 space-y-2">
          <div className="flex items-start gap-2"><span className="text-xs px-2 py-0.5 rounded-full border border-white/20">{b.kind === 'manual' ? '🙋 Member' : '🤖 Auto'}</span><span className="text-xs text-gray-400 ml-auto">{b.count}× · {timeAgo(b.last_seen)}</span></div>
          <p className="text-sm font-semibold break-words">{b.message}</p>
          {b.note && b.note !== b.message && <p className="text-sm text-gray-300 break-words">“{b.note}”</p>}
          <p className="text-xs text-gray-500 break-all">{b.page} · {b.screen}<br />{b.ua}</p>
          {b.stack && <details><summary className="text-xs text-gray-400 cursor-pointer">Details</summary><pre className="text-[11px] text-gray-400 whitespace-pre-wrap break-words mt-1">{b.stack}</pre></details>}
          <div className="flex flex-wrap gap-1.5">{Object.entries(ST).map(([k, n]) => <button key={k} className={'sym-btn !min-h-[34px] !px-2.5 text-xs' + (b.status === k ? '' : ' opacity-60')} onClick={() => set(b.id, k)}>{n}</button>)}<button className="sym-btn danger !min-h-[34px] !px-2.5 text-xs ml-auto" onClick={() => del(b.id)}>Delete</button></div>
        </div>))}
    </div>)
}
