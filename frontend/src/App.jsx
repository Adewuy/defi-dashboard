import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Protocols from './pages/Protocols'
import ProtocolDetail from './pages/ProtocolDetail'
import Compare from './pages/Compare'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        padding: 'clamp(1rem, 4vw, 1.75rem) clamp(1rem, 4vw, 2rem)',
        paddingBottom: 'calc(clamp(1rem, 4vw, 1.75rem) + 70px)',
        minWidth: 0,
        overflowX: 'auto',
      }}>
        <Routes>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/protocols"    element={<Protocols />} />
          <Route path="/protocol/:id" element={<ProtocolDetail />} />
          <Route path="/compare"      element={<Compare />} />
          <Route path="/alerts"       element={<Alerts />} />
          <Route path="/settings"     element={<Settings />} />
          <Route path="*"             element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}
