import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib'

type Mine = { code: string; count: number; redeemed: boolean; invited: { name: string; at: string }[]; milestones: { milestone: number; item: string; name: string; reached: boolean; owned: boolean }[] }

// Invite codes: share yours, or enter the code of the player who invited you (new accounts only). Rewards are granted by the database.
export function Referrals() {
  const [d, setD] = useState<Mine | null>(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(() => { supabase.rpc('referral_my').then(r => { if (r.error) setErr(r.error.message + ' — an admin needs to run 12_SYMBIOTES_REFERRALS.sql in Supabase.'); else { setErr(''); setD(r.data as Mine) } }) }, [])
  useEffect(() => { load() }, [load])
  const copy = async () => { if (!d) return; try { await navigator.clipboard.writeText(d.code); setMsg('Code copied ✅') } catch { setMsg('Copy failed: select the code and copy it by hand.') } }
  const share = async () => { if (!d) return; const text = `Join me on SYMBIOTES! Use my invite code ${d.code} after you log in (Menu → Referrals).`; try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); setMsg('Invite message copied ✅') } } catch { /* cancelled */ } }
  const redeem = async () => {
    if (busy || code.trim().length < 8) return; setBusy(true); setMsg('')
    const r = await supabase.rpc('referral_redeem', { p_code: code }); setBusy(false)
    if (r.error) return setMsg('❌ ' + r.error.message)
    setMsg(`Welcome! You joined through ${(r.data as { inviter?: string })?.inviter ?? 'a member'} ✅`); setCode(''); load()
  }
  return (
    <div className="space-y-4">
      <div><h1 className="h1">Referrals</h1><p className="text-sm text-gray-400">Invite new players to SYMBIOTES and unlock rewards.</p></div>
      {err && <p className="glass p-3 text-amber-300 text-sm" role="alert">{err}</p>}
      {!d && !err && <p className="text-center text-gray-400 animate-pulse">Loading…</p>}
      {d && <>
        <div className="glass p-4 text-center">
          <p className="text-xs text-gray-400">Your invite code</p>
          <p className="text-3xl font-bold tracking-[.25em] my-2 select-all" aria-label={'Your invite code ' + d.code.split('').join(' ')}>{d.code}</p>
          <div className="flex gap-2 justify-center flex-wrap"><button className="sym-btn" onClick={copy}>Copy code</button><button className="sym-btn" onClick={share}>Share</button></div>
          <p className="text-xs text-gray-400 mt-3">{d.count} player{d.count === 1 ? '' : 's'} joined with your code</p>
        </div>
        {!!d.milestones.length && <div className="glass p-4"><h2 className="h2 mb-2">Milestones</h2><ul className="wear">{d.milestones.map(m => <li key={m.milestone}><span className="text-xs text-gray-400">{m.milestone} invited</span><b className="truncate">{m.name}</b><small className={m.owned ? 'text-emerald-300' : m.reached ? 'text-amber-300' : 'text-gray-500'}>{m.owned ? '✓ Unlocked' : m.reached ? 'Reached' : `${Math.max(0, m.milestone - d.count)} to go`}</small></li>)}</ul></div>}
        {!!d.invited.length && <div className="glass p-4"><h2 className="h2 mb-2">Players you invited</h2><ul className="space-y-1 text-sm">{d.invited.map((x, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{x.name}</span><small className="text-gray-400">{new Date(x.at).toLocaleDateString()}</small></li>)}</ul></div>}
        {!d.redeemed && <div className="glass p-4"><h2 className="h2 mb-1">Were you invited?</h2><p className="text-xs text-gray-400 mb-2">New accounts can enter the code of the player who invited them (first 14 days, once only).</p>
          <div className="flex gap-2"><input className="sym-inp !mb-0 uppercase tracking-widest" maxLength={8} placeholder="ABCD2345" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && redeem()} autoCapitalize="characters" autoComplete="off" /><button className="sym-btn" disabled={busy || code.length < 8} onClick={redeem}>{busy ? '…' : 'Use code'}</button></div></div>}
        {msg && <p className="text-amber-300 text-sm" role="status">{msg}</p>}
      </>}
    </div>)
}
