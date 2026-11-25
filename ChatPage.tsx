import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Avatar } from './Social'
import { BackgroundPreview, PhotoPick } from './PhotoCropper'

type Msg = { id: string; conversation_id?: string; sender_id: string; body: string | null; kind: string; media_path: string | null; created_at: string; deleted_at?: string | null }
type Conv = { id: string; type: string; name: string | null; other?: string; avatar_url?: string | null; bg_url?: string | null; bg_color?: string | null; role?: string }
type Meta = { last?: Msg; unread: number }
const PAGE = 60
const BUCKET = 'chat-media'
const GROUP_BUCKET = 'group-media'   // public bucket created by SYMBIOTES_PHASE13.sql
const BASE_COLS = 'id,type,name'
const EXT_COLS = 'id,type,name,avatar_url,bg_url,bg_color'

// Ready-made chat backgrounds an admin can pick instead of uploading a picture (the key is what gets saved)
export const BG_PRESETS: Record<string, string> = {
  p_violet: 'linear-gradient(160deg,#1e1048,#3b1d7a)', p_ocean: 'linear-gradient(160deg,#06283d,#0b5d7a)', p_forest: 'linear-gradient(160deg,#07241a,#0f5a3c)',
  p_ember: 'linear-gradient(160deg,#2b0d0d,#7a2410)', p_rose: 'linear-gradient(160deg,#2d0b24,#7a1d55)', p_night: 'linear-gradient(160deg,#05060d,#1a2038)',
}
const NAME_COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171']
const nameColor = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return NAME_COLORS[h % NAME_COLORS.length] }

const seenKey = (uid: string) => 'sym-chat-seen:' + uid
const readSeen = (uid: string): Record<string, number> => { try { return JSON.parse(localStorage.getItem(seenKey(uid)) || '{}') } catch { return {} } }
const writeSeen = (uid: string, id: string, ms: number) => { try { const s = readSeen(uid); if ((s[id] ?? 0) < ms) { s[id] = ms; localStorage.setItem(seenKey(uid), JSON.stringify(s)) } } catch { /* storage blocked: unread badges just reset */ } }
const hhmm = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const dayLabel = (d: string) => {
  const t = new Date(d); const n = new Date(); const sod = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((sod(n) - sod(t)) / 86400000)
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : t.toLocaleDateString([], { day: 'numeric', month: 'short', year: t.getFullYear() === n.getFullYear() ? undefined : 'numeric' })
}
const listTime = (d: string) => { const diff = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000); return diff === 0 ? hhmm(d) : diff === 1 ? 'Yesterday' : new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' }) }

export function Chat() {
  const { session, isAdmin } = useAuth(); const uid = session!.user.id; const [q, setQ] = useSearchParams(); const nav = useNavigate()
  const [convs, setConvs] = useState<Conv[]>([]); const [cur, setCurS] = useState<string | null>(q.get('c'))
  const [meta, setMeta] = useState<Record<string, Meta>>({})
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState('')
  const [people, setPeople] = useState<any[]>([]); const [names, setNames] = useState<Record<string, { name: string; avatar?: string | null; username?: string }>>({})
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [panel, setPanel] = useState<'none' | 'new' | 'group' | 'members'>('none'); const [gname, setGname] = useState(''); const [picked, setPicked] = useState<string[]>([])
  const [members, setMembers] = useState<any[]>([]); const [addId, setAddId] = useState('')
  const [rec, setRec] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [bgFile, setBgFile] = useState<File | null>(null); const [ext, setExt] = useState(true); const [more, setMore] = useState(false); const [vh, setVh] = useState<number | null>(null)
  const stick = useRef(true)
  const recRef = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const endRef = useRef<HTMLDivElement>(null)
  const convRef = useRef<Conv[]>([]); const curRef = useRef<string | null>(cur); convRef.current = convs; curRef.current = cur
  const setCur = (id: string | null) => { setCurS(id); setQ(id ? { c: id } : {}, { replace: true }); setPanel('none'); setErr('') }
  const curConv = convs.find(c => c.id === cur)
  const title = (c?: Conv) => (c ? (c.type === 'group' ? c.name ?? 'Group' : names[c.other ?? '']?.name ?? 'Chat') : '')
  const canManage = !!curConv && curConv.type === 'group' && (isAdmin || ['admin', 'owner', 'creator'].includes(curConv.role ?? ''))

  const loadMeta = async (list: Conv[]) => {
    const seen = readSeen(uid)
    const res = await Promise.all(list.map(async (c): Promise<[string, Meta]> => {
      const l = await supabase.from('messages').select('id,conversation_id,sender_id,body,kind,media_path,created_at,deleted_at').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1)
      const last = (l.data?.[0] as Msg | undefined); let unread = 0
      if (last) {
        const lt = Date.parse(last.created_at); const s = seen[c.id]
        if (s === undefined) writeSeen(uid, c.id, lt)   // first time on this device: start with everything marked as read
        else if (lt > s) { const n = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', c.id).neq('sender_id', uid).gt('created_at', new Date(s).toISOString()); unread = n.count ?? 0 }
      }
      return [c.id, { last, unread }]
    }))
    setMeta(m => ({ ...m, ...Object.fromEntries(res.map(([id, x]) => [id, id === curRef.current ? { last: x.last, unread: 0 } : x])) }))
  }
  const loadConvs = async () => {
    // New columns (group photo / background) exist only after SYMBIOTES_PHASE13.sql; fall back so chat never breaks before it is run.
    let r: any = await supabase.from('conversation_members').select(`role,conversations(${EXT_COLS})`).eq('user_id', uid)
    if (r.error) { setExt(false); r = await supabase.from('conversation_members').select(`role,conversations(${BASE_COLS})`).eq('user_id', uid) } else setExt(true)
    if (r.error) { r = await supabase.from('conversation_members').select(`conversations(${BASE_COLS})`).eq('user_id', uid) }
    const list: Conv[] = (r.data ?? []).map((x: any) => x.conversations ? { ...x.conversations, role: x.role } : null).filter(Boolean)
    const dmIds = list.filter(c => c.type === 'dm').map(c => c.id)
    if (dmIds.length) {
      const o = await supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id', dmIds).neq('user_id', uid)
      const m = new Map((o.data ?? []).map((x: any) => [x.conversation_id, x.user_id]))
      list.forEach(c => { if (c.type === 'dm') c.other = m.get(c.id) as string })
    }
    setConvs(list); loadMeta(list)
  }
  useEffect(() => {
    loadConvs()
    supabase.from('profiles').select('id,username,display_name,avatar_url').eq('status', 'active').then(r => {
      const all = r.data ?? []; setPeople(all.filter((p: any) => p.id !== uid))
      setNames(Object.fromEntries(all.map((p: any) => [p.id, { name: p.display_name || p.username, avatar: p.avatar_url, username: p.username }])))
    })
    // previews: any new message in any of my chats updates the list at once (no need to open the group)
    const all = supabase.channel('m-all-' + uid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p: any) => {
      const m = p.new as Msg; const cid = m.conversation_id; if (!cid) return
      if (!convRef.current.some(c => c.id === cid)) { loadConvs(); return }
      const open = curRef.current === cid; if (open) writeSeen(uid, cid, Date.parse(m.created_at))
      setMeta(x => ({ ...x, [cid]: { last: m, unread: open || m.sender_id === uid ? 0 : (x[cid]?.unread ?? 0) + 1 } }))
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (p: any) => {
      const n = p.new; setConvs(cs => cs.map(c => c.id === n.id ? { ...c, name: n.name ?? c.name, avatar_url: n.avatar_url, bg_url: n.bg_url, bg_color: n.bg_color } : c))
    }).subscribe()
    const vis = () => { if (document.visibilityState === 'visible') loadConvs() }; document.addEventListener('visibilitychange', vis)
    return () => { supabase.removeChannel(all); document.removeEventListener('visibilitychange', vis) }
  }, [])

  const sign = async (list: Msg[]) => {
    const paths = list.map(m => m.media_path).filter((p): p is string => !!p)
    if (!paths.length) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 86400)
    if (data) setUrls(u => ({ ...u, ...Object.fromEntries(data.filter(d => d.path && d.signedUrl).map(d => [d.path as string, d.signedUrl as string])) }))
  }
  useEffect(() => {
    if (!cur) return
    setMsgs([]); setMeta(m => ({ ...m, [cur]: { last: m[cur]?.last, unread: 0 } }))
    let dead = false; stick.current = true; setMore(false)
    // newest page first; also used to catch up after the phone was asleep (realtime misses events while offline)
    const fetchLatest = () => supabase.from('messages').select('*').eq('conversation_id', cur).order('created_at', { ascending: false }).limit(PAGE)
      .then(r => { if (dead || r.error) return; const l = ((r.data ?? []) as Msg[]).reverse(); setMore((r.data ?? []).length >= PAGE)
        setMsgs(old => { const ids = new Set(l.map(x => x.id)); const oldest = l[0]?.created_at ?? ''; return [...old.filter(x => !ids.has(x.id) && x.created_at < oldest), ...l] })
        sign(l); if (l.length) writeSeen(uid, cur, Date.parse(l[l.length - 1].created_at)) })
    fetchLatest()
    const ch = supabase.channel('m-' + cur).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cur },
      (p: any) => { setMsgs(m => m.some(x => x.id === p.new.id) ? m : [...m, p.new]); sign([p.new]) }).subscribe(st => { if (st === 'SUBSCRIBED') fetchLatest() })
    const vis = () => { if (document.visibilityState === 'visible') fetchLatest() }; document.addEventListener('visibilitychange', vis)
    return () => { dead = true; supabase.removeChannel(ch); document.removeEventListener('visibilitychange', vis) }
  }, [cur])
  const loadOlder = async () => {
    const first = msgs[0]; if (!cur || !first) return
    const r = await supabase.from('messages').select('*').eq('conversation_id', cur).lt('created_at', first.created_at).order('created_at', { ascending: false }).limit(PAGE)
    if (r.error) return setErr(r.error.message)
    const l = ((r.data ?? []) as Msg[]).reverse(); setMore((r.data ?? []).length >= PAGE); stick.current = false
    setMsgs(old => { const ids = new Set(old.map(x => x.id)); return [...l.filter(x => !ids.has(x.id)), ...old] }); sign(l)
  }
  // keep the newest message in view only when the reader is already at the bottom (never yank them while reading history)
  useEffect(() => { if (stick.current) endRef.current?.scrollIntoView({ behavior: msgs.length > 1 ? 'smooth' : 'auto' }) }, [msgs.length, cur])
  // Android Chrome does not shrink fixed layouts when the keyboard opens: follow the visual viewport so the input stays visible
  useEffect(() => {
    const vv = window.visualViewport; if (!vv || !cur) return
    const f = () => { setVh(vv.height < window.innerHeight - 120 ? Math.round(vv.height) : null); window.scrollTo(0, 0) }; f(); vv.addEventListener('resize', f)
    return () => { vv.removeEventListener('resize', f); setVh(null) }
  }, [cur])
  const loadMembers = async () => { const { data } = await supabase.from('conversation_members').select('user_id,role').eq('conversation_id', cur!); setMembers(data ?? []) }
  useEffect(() => { if (cur && curConv?.type === 'group') loadMembers() }, [cur, panel, curConv?.type])

  const sendText = async () => {
    if (!cur || !text.trim()) return
    const t = text.trim(); setText('')
    stick.current = true
    const { data, error } = await supabase.from('messages').insert({ conversation_id: cur, sender_id: uid, body: t, kind: 'text' }).select().single()
    if (error) { setText(t); return setErr(error.message) }   // keep what they typed
    setErr(''); if (data) setMsgs(m => m.some(x => x.id === (data as Msg).id) ? m : [...m, data as Msg])
  }
  const sendMedia = async (blob: Blob, name: string, kind: string, type: string) => {
    if (!cur) return
    setBusy(true); setErr('')
    const path = `${cur}/${uid}-${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    if (blob.size > 50 * 1024 * 1024) { setBusy(false); return setErr('File is too big (max 50 MB).') }
    const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type || 'application/octet-stream' })
    if (up.error) { setBusy(false); return setErr(up.error.message) }
    stick.current = true
    const { data, error } = await supabase.from('messages').insert({ conversation_id: cur, sender_id: uid, body: name, kind, media_path: path }).select().single()
    setBusy(false); setErr(error?.message ?? '')
    if (data) { setMsgs(m => m.some(x => x.id === (data as Msg).id) ? m : [...m, data as Msg]); sign([data as Msg]) }
  }
  const pickFile = (f?: File) => { if (!f) return; sendMedia(f, f.name, f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file', f.type || 'application/octet-stream') }
  const toggleRec = async () => {
    if (rec) { recRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(stream); chunks.current = []
      mr.ondataavailable = e => chunks.current.push(e.data)
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); setRec(false)
        const type = (mr.mimeType || 'audio/webm').split(';')[0]; const fx = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        sendMedia(new Blob(chunks.current, { type }), `voice.${fx}`, 'voice', type) }
      recRef.current = mr; mr.start(); setRec(true)
    } catch { setErr('Allow the microphone to send voice messages.') }
  }
  const dm = async (id: string) => { const { data, error } = await supabase.rpc('get_or_create_dm', { other: id }); if (error) return setErr(error.message); await loadConvs(); setCur(data) }
  const mkGroup = async () => {
    if (!gname.trim()) return setErr('Give the group a name.')
    const { data, error } = await supabase.rpc('create_group', { p_name: gname.trim(), p_desc: null, p_privacy: 'private', p_members: picked, p_admins: [] })
    if (error) return setErr(error.message); setGname(''); setPicked([]); await loadConvs(); setCur(data)
  }
  const addMember = async () => { const { error } = await supabase.from('conversation_members').insert({ conversation_id: cur, user_id: addId, role: 'member' }); setErr(error?.message ?? ''); setAddId(''); loadMembers() }
  const removeMember = async (id: string) => { const { error } = await supabase.from('conversation_members').delete().eq('conversation_id', cur!).eq('user_id', id); setErr(error?.message ?? ''); loadMembers() }

  // ---- group photo + background (group admins / site admins; enforced again in the database) ----
  const patchConv = (id: string, p: Partial<Conv>) => setConvs(cs => cs.map(c => c.id === id ? { ...c, ...p } : c))
  const upImage = async (blob: Blob, name: string) => {
    const path = `${cur}/${name}-${Date.now()}.jpg`
    const up = await supabase.storage.from(GROUP_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
    if (up.error) throw new Error(up.error.message + (/bucket/i.test(up.error.message) ? ' (run SYMBIOTES_PHASE13.sql first)' : ''))
    return supabase.storage.from(GROUP_BUCKET).getPublicUrl(path).data.publicUrl
  }
  const saveGroupPhoto = async (blob: Blob) => {
    const url = await upImage(blob, 'photo')
    const { error } = await supabase.rpc('set_group_photo', { p_conv: cur, p_url: url }); if (error) throw new Error(error.message)
    patchConv(cur!, { avatar_url: url }); setErr('')
  }
  const saveBackground = async (blob: Blob) => {
    const url = await upImage(blob, 'bg')
    const { error } = await supabase.rpc('set_group_background', { p_conv: cur, p_url: url, p_color: null }); if (error) throw new Error(error.message)
    patchConv(cur!, { bg_url: url, bg_color: null }); setBgFile(null); setErr('')
  }
  const setPreset = async (key: string | null) => {
    const { error } = await supabase.rpc('set_group_background', { p_conv: cur, p_url: null, p_color: key }); if (error) return setErr(error.message)
    patchConv(cur!, { bg_url: null, bg_color: key }); setErr('')
  }

  const removeMsg = async (m: Msg) => { const reason = prompt('Reason for removing this message (optional):'); if (reason === null) return; const { error } = await supabase.rpc('admin_remove_message', { p_id: m.id, p_reason: reason || null }); if (error) return setErr(error.message); setMsgs(x => x.map(y => y.id === m.id ? { ...y, deleted_at: new Date().toISOString(), body: null, media_path: null } : y)) }
  const reportMsg = async (m: Msg) => { if (!confirm('Report this message to the admins?')) return; const { error } = await supabase.from('reports').insert({ reporter: uid, target_type: 'message', target_id: m.id, reason: 'Reported from chat' }); setErr(error ? error.message : 'Reported to the admins.') }
  const body = (m: Msg) => {
    if (m.deleted_at) return <i className="text-gray-400">Removed by moderator.</i>
    const u = m.media_path ? urls[m.media_path] : undefined
    if (m.kind === 'image') return u ? <img src={u} className="max-w-[230px] rounded-xl" loading="lazy" alt="" /> : <i>loading…</i>
    if (m.kind === 'video') return u ? <video src={u} controls playsInline preload="metadata" className="max-w-[240px] rounded-xl" /> : <i>loading…</i>
    if (m.kind === 'voice') return u ? <audio src={u} controls preload="none" className="max-w-[220px]" /> : <i>loading…</i>
    if (m.kind === 'file') return u ? <a href={u} target="_blank" rel="noreferrer" className="underline">📎 {m.body}</a> : <i>loading…</i>
    return <>{m.body}</>
  }
  const preview = (c: Conv) => {
    const l = meta[c.id]?.last; if (!l) return c.type === 'group' ? 'No messages yet' : 'Say hello 👋'
    const who = l.sender_id === uid ? 'You' : (names[l.sender_id]?.name ?? 'Member')
    const what = l.deleted_at ? 'Message removed' : l.kind === 'image' ? '📷 Photo' : l.kind === 'video' ? '🎥 Video' : l.kind === 'voice' ? '🎤 Voice message' : l.kind === 'file' ? '📎 ' + (l.body ?? 'File') : (l.body ?? '')
    return c.type === 'group' || l.sender_id === uid ? `${who}: ${what}` : what
  }
  const inIds = members.map(x => x.user_id)
  const chatBg = (c?: Conv): CSSProperties | undefined => {
    if (!c) return undefined
    if (c.bg_url) return { backgroundImage: `linear-gradient(rgba(8,5,25,.5),rgba(8,5,25,.5)),url(${c.bg_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    if (c.bg_color && BG_PRESETS[c.bg_color]) return { backgroundImage: BG_PRESETS[c.bg_color] }
    return undefined
  }
  const headAvatar = (c: Conv, size: number) => c.type === 'group' ? <Avatar url={c.avatar_url} name={title(c)} size={size} ring="none" /> : <Avatar uid={c.other} url={names[c.other ?? '']?.avatar} name={title(c)} size={size} />

  if (cur && curConv) return (
    <div className="chat-full" style={vh ? { height: vh, bottom: 'auto' } : undefined}>
      <div className="chat-head">
        <button className="text-2xl px-2" onClick={() => setCur(null)} aria-label="Back to chats">‹</button>
        <button className="flex items-center gap-2 min-w-0 flex-1 text-left" onClick={() => curConv.type === 'group' ? setPanel(panel === 'members' ? 'none' : 'members') : names[curConv.other ?? '']?.username && nav('/u/' + names[curConv.other ?? ''].username)}>
          {headAvatar(curConv, 36)}
          <span className="min-w-0"><b className="block truncate leading-tight">{title(curConv)}</b>{curConv.type === 'group' && <small className="block text-[11px] text-gray-400 leading-tight">{members.length ? `${members.length} members · tap for group info` : 'Tap for group info'}</small>}</span>
        </button>
        {curConv.type === 'group' && <button className="sym-btn !py-1" onClick={() => setPanel(panel === 'members' ? 'none' : 'members')}>{canManage ? 'Manage' : 'Members'}</button>}
      </div>
      {panel === 'members' && <div className="p-3 bg-white/5 text-sm max-h-[60vh] overflow-y-auto">
        {canManage && <div className="mb-3 pb-3 border-b border-white/10">
          <PhotoPick url={curConv.avatar_url} name={title(curConv)} title="Group photo" saveLabel="Save group photo" onSave={saveGroupPhoto} disabled={!ext} hint={ext ? 'Group photo: crop, resize and preview.' : 'Run SYMBIOTES_PHASE13.sql in Supabase to enable.'} />
          <div className="mt-3"><div className="font-semibold text-sm mb-1">Chat background</div>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(BG_PRESETS).map(([k, g]) => <button key={k} type="button" className={'bg-sw' + (curConv.bg_color === k && !curConv.bg_url ? ' on' : '')} style={{ backgroundImage: g }} onClick={() => setPreset(k)} disabled={!ext} aria-label={'Background ' + k.slice(2)} />)}
              <label className={'sym-btn !py-1 cursor-pointer' + (ext ? '' : ' opacity-50')}>🖼 Picture<input type="file" accept="image/*" className="hidden" disabled={!ext} onChange={e => { const f = e.target.files?.[0]; if (f) setBgFile(f); e.target.value = '' }} /></label>
              {(curConv.bg_url || curConv.bg_color) && <button type="button" className="sym-btn danger !py-1" onClick={() => setPreset(null)}>Remove</button>}
            </div></div>
        </div>}
        <div className="font-semibold text-xs text-gray-400 mb-1">MEMBERS ({members.length})</div>
        {members.map(x => <div key={x.user_id} className="flex items-center gap-2 py-1"><Avatar uid={x.user_id} url={names[x.user_id]?.avatar} name={names[x.user_id]?.name} size={32} /><span className="flex-1 min-w-0 truncate">{names[x.user_id]?.name ?? 'member'}{x.user_id === uid ? ' (you)' : ''} <span className="text-gray-500">({x.role})</span></span>{canManage && x.user_id !== uid && <button className="text-red-400" onClick={() => removeMember(x.user_id)}>remove</button>}</div>)}
        {canManage && <div className="flex gap-2 mt-2"><select className="sym-inp !mb-0" value={addId} onChange={e => setAddId(e.target.value)}><option value="">Add member…</option>{people.filter(p => !inIds.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.display_name || p.username}</option>)}</select><button className="sym-btn" onClick={addMember}>Add</button></div>}</div>}
      <div className="chat-msgs" style={chatBg(curConv)} onScroll={e => { const t = e.currentTarget; stick.current = t.scrollHeight - t.scrollTop - t.clientHeight < 140 }}>
        {more && <button type="button" className="sym-btn !py-1 self-center text-xs" onClick={loadOlder}>Load older messages</button>}
        {msgs.map((m, i) => {
          const mine = m.sender_id === uid; const grp = curConv.type === 'group'; const prev = msgs[i - 1]; const next = msgs[i + 1]
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
          const first = newDay || prev.sender_id !== m.sender_id; const last = !next || next.sender_id !== m.sender_id || new Date(next.created_at).toDateString() !== new Date(m.created_at).toDateString()
          const who = names[m.sender_id]
          return <div key={m.id} className="contents">
            {newDay && <div className="day-chip"><span>{dayLabel(m.created_at)}</span></div>}
            <div className={'mrow' + (mine ? ' me' : '') + (first ? ' first' : '')}>
              {grp && !mine && (last ? <Avatar uid={m.sender_id} url={who?.avatar} name={who?.name} size={30} /> : <span className="mav-gap" />)}
              <div className={'bubble ' + (mine ? 'me' : '')}>
                {grp && first && <div className="bname" style={{ color: mine ? '#a7f3d0' : nameColor(m.sender_id) }}>{mine ? 'You' : who?.name ?? 'member'}</div>}
                {body(m)}<span className="btime">{hhmm(m.created_at)}</span>
                {!m.deleted_at && (isAdmin ? <button className="block text-[10px] text-red-300 mt-1" onClick={() => removeMsg(m)}>🗑 Remove (moderator)</button> : !mine && <button className="block text-[10px] opacity-50 mt-1" onClick={() => reportMsg(m)}>⚑ Report</button>)}</div>
              {grp && mine && (last ? <Avatar uid={uid} url={names[uid]?.avatar} name={names[uid]?.name} size={30} /> : <span className="mav-gap" />)}
            </div></div>
        })}
        <div ref={endRef} />
      </div>
      {err && <p className="text-amber-300 text-xs px-3">{err}</p>}
      <div className="chat-input">
        <label className="icon-btn">📎<input type="file" className="hidden" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} /></label>
        <input className="sym-inp !mb-0 !rounded-full" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendText() }} enterKeyHint="send" placeholder={busy ? 'Uploading…' : 'Message…'} />
        {text.trim() ? <button className="icon-btn send" onClick={sendText}>➤</button> : <button className={'icon-btn' + (rec ? ' rec' : '')} onClick={toggleRec}>{rec ? '⏹' : '🎤'}</button>}
      </div>
      {bgFile && <BackgroundPreview file={bgFile} onCancel={() => setBgFile(null)} onSave={saveBackground} />}
    </div>
  )

  const sorted = [...convs].sort((a, b) => Date.parse(meta[b.id]?.last?.created_at ?? '1970-01-01') - Date.parse(meta[a.id]?.last?.created_at ?? '1970-01-01'))
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Messages</h2>
        <div className="flex gap-2"><button className="sym-btn" onClick={() => setPanel(panel === 'new' ? 'none' : 'new')}>✏️ New</button>{isAdmin && <button className="sym-btn" onClick={() => setPanel(panel === 'group' ? 'none' : 'group')}>👥 Group</button>}</div></div>
      {panel === 'new' && <div className="glass p-2 max-h-72 overflow-y-auto">{people.map(p => <button key={p.id} className="flex items-center gap-3 w-full p-2 text-left" onClick={() => dm(p.id)}><Avatar uid={p.id} url={p.avatar_url} name={p.display_name || p.username} size={36} />{p.display_name || p.username}</button>)}</div>}
      {panel === 'group' && <div className="glass p-3"><input className="sym-inp" placeholder="Group name" value={gname} onChange={e => setGname(e.target.value)} />
        <p className="text-xs text-gray-400 mb-1">Add members:</p><div className="max-h-48 overflow-y-auto">{people.map(p => <label key={p.id} className="flex items-center gap-2 text-sm py-1"><input type="checkbox" checked={picked.includes(p.id)} onChange={e => setPicked(e.target.checked ? [...picked, p.id] : picked.filter(x => x !== p.id))} /><Avatar uid={p.id} url={p.avatar_url} name={p.display_name || p.username} size={28} /> {p.display_name || p.username}</label>)}</div>
        <button className="sym-btn mt-2 w-full" onClick={mkGroup}>Create group</button></div>}
      {sorted.map(c => { const mt = meta[c.id]; return <button key={c.id} className="glass p-3 flex items-center gap-3 w-full text-left" onClick={() => setCur(c.id)}>
        {headAvatar(c, 46)}
        <div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><b className="truncate flex-1">{title(c)}</b>{mt?.last && <small className={'text-[11px] ' + (mt.unread ? 'text-emerald-300' : 'text-gray-400')}>{listTime(mt.last.created_at)}</small>}</div>
          <div className="flex items-center gap-2"><div className={'text-xs truncate flex-1 ' + (mt?.unread ? 'text-white font-medium' : 'text-gray-400')}>{preview(c)}</div>{!!mt?.unread && <span className="unread-b">{mt.unread > 99 ? '99+' : mt.unread}</span>}</div></div></button> })}
      {!convs.length && <p className="text-gray-400 text-sm text-center mt-8">No chats yet. {isAdmin ? 'Create a group or start a new chat.' : 'Start a new chat, or wait for an admin to add you to a group.'}</p>}
      {err && <p className="text-amber-300 text-sm">{err}</p>}
    </div>
  )
}
