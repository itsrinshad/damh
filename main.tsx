import { Component, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { IntroGate } from './IntroGate'
import { AuthProvider } from './auth'
import './index.css'
import './neon.css'
import { applyPrefs } from './prefs'
import { startSiteStyleSync } from './siteStyle'
import { reportError, startBugCapture } from './bugReport'
import { startSiteFx } from './siteFx'
applyPrefs()
startSiteStyleSync()
startBugCapture()
startSiteFx()
class Boundary extends Component<{ children: ReactNode }, { e: string | null }> {
  state = { e: null as string | null }
  static getDerivedStateFromError(e: unknown) { return { e: String((e as Error)?.message ?? e) } }
  componentDidCatch(e: unknown) { reportError(e, 'react') }
  render() { return this.state.e ? <pre style={{ color: '#fbbf24', padding: 16, whiteSpace: 'pre-wrap' }}>SYMBIOTES error:{'\n'}{this.state.e}</pre> : this.props.children }
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Boundary><BrowserRouter><AuthProvider><App /><IntroGate /></AuthProvider></BrowserRouter></Boundary>)
