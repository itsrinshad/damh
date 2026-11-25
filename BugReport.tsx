import { useState } from 'react'
import { recentErrors, submitBug } from './bugReport'

/** "Report a bug" sheet. The page, device and the last errors on this phone are attached automatically. */
export function BugModal({ onClose }: { onClose: () => void }) {
  const [txt, setTxt] = useState(''); const [st, setSt] = useState<'idle' | 'busy' | 'ok' | 'fail'>('idle'); const n = recentErrors().length
  const go = async () => { if (txt.trim().length < 5) return; setSt('busy'); setSt((await submitBug(txt)) ? 'ok' : 'fail') }
  return (
    <div className="bug-bg" onClick={onClose}>
      <div className="bug-sheet glass" role="dialog" aria-label="Report a bug" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-lg">🐛 Report a bug</h3>
        {st === 'ok' ? <><p className="text-sm text-gray-300 my-3">Thanks! The admins got your report ✅</p><button className="sym-btn w-full" onClick={onClose}>Close</button></> : <>
          <p className="text-xs text-gray-400 mt-1">Tell us what went wrong. We attach the page, your phone/browser and the last error{n === 1 ? '' : 's'} ({n}) automatically.</p>
          <textarea className="sym-inp mt-3" rows={4} maxLength={1000} placeholder="What happened? What were you doing?" value={txt} onChange={e => setTxt(e.target.value)} />
          {st === 'fail' && <p className="text-amber-300 text-xs">Could not send. Check your internet or ask an admin to run the Phase 18 SQL.</p>}
          <div className="flex gap-2 mt-3"><button className="sym-btn flex-1 opacity-80" onClick={onClose}>Cancel</button><button className="sym-btn flex-1" disabled={st === 'busy' || txt.trim().length < 5} onClick={go}>{st === 'busy' ? 'Sending…' : 'Send report'}</button></div>
        </>}
      </div>
    </div>)
}
