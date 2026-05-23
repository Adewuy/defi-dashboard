// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import { useHealth } from '../hooks/useData'

const NAV = [
  { to: '/',          icon: '📊', label: 'Dashboard' },
  { to: '/protocols', icon: '📋', label: 'All Protocols' },
  { to: '/compare',   icon: '⚖️', label: 'Compare' },
  { to: '/alerts',    icon: '🔔', label: 'Alerts' },
  { to: '/settings',  icon: '⚙️', label: 'Settings' },
]

export default function Sidebar() {
  const { data: health } = useHealth()

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
    background: isActive ? 'var(--accent-faint)' : 'transparent',
    transition: 'all 0.15s',
  })

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 0.75rem',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 12px 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>📈 DeFi Scan</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Sustainability Analytics</div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} style={linkStyle}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Status indicator */}
      {health && (
        <div style={{ padding: '12px', background: 'var(--card-bg)', borderRadius: 10, border: '1px solid var(--border)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: health.status === 'ok' ? '#1D9E75' : '#E05252', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              {health.status === 'ok' ? 'System Online' : 'System Issue'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <div>📡 DeFiLlama: Active</div>
            <div>💰 CoinGecko: Active</div>
            <div>🤖 Telegram: {health.telegram_configured ? '✅' : '⚪ Not set'}</div>
            <div>📊 Dune: {health.dune_configured ? '✅' : '⚪ Not set'}</div>
          </div>
          {health.last_pipeline_run && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, borderTop: '1px solid var(--border-faint)', paddingTop: 6 }}>
              Last refresh: {new Date(health.last_pipeline_run).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}