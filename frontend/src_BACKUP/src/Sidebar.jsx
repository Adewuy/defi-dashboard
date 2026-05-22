import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useHealth } from '../hooks/useData'
import { Menu, Home, List, GitCompare, Bell } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', Icon: Home },
  { to: '/protocols', label: 'All Protocols', short: 'Protocols', Icon: List },
  { to: '/compare', label: 'Compare', short: 'Compare', Icon: GitCompare },
  { to: '/alerts', label: 'Alerts', short: 'Alerts', Icon: Bell },
  { to: '/settings', label: 'Settings', short: 'More', Icon: Menu },
]

export default function Sidebar() {
  const { data: health } = useHealth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

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
    <>
      <style>{`
        @media (max-width: 767px) {
          .desktop-sidebar {
            display: none !important;
          }

          .mobile-bottomnav {
            display: flex !important;
          }

          main,
          #root > div > main {
            padding-bottom: 80px !important;
          }
        }

        @media (min-width: 768px) {
          .desktop-sidebar {
            display: flex !important;
          }

          .mobile-bottomnav {
            display: none !important;
          }

          .mobile-drawer,
          .drawer-overlay {
            display: none !important;
          }
        }

        .mobile-bottomnav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--sidebar-bg, #fff);
          border-top: 1px solid var(--border, #eee);
          z-index: 99;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .mobile-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 260px;
          background: var(--sidebar-bg, #fff);
          border-right: 1px solid var(--border, #eee);
          display: flex;
          flex-direction: column;
          padding: 1.5rem 0.75rem;
          z-index: 101;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
        }

        .mobile-drawer.open {
          transform: translateX(0);
        }

        .drawer-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 100;
        }

        .drawer-overlay.open {
          display: block;
        }

        .tab-btn {
          flex: 1;
          padding: 10px 4px 8px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          font-size: 10px;
          color: var(--text-muted, #888);
        }

        .tab-btn.active {
          color: var(--accent, #2563eb);
        }

        .tab-icon {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <aside
        className="desktop-sidebar"
        style={{
          width: 220,
          minHeight: '100vh',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          flexDirection: 'column',
          padding: '1.5rem 0.75rem',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '0 12px 1.5rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            DeFi Scan
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Sustainability Analytics
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} style={linkStyle}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {health && (
          <div
            style={{
              padding: '12px',
              background: 'var(--card-bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              marginTop: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: health.status === 'ok' ? '#1D9E75' : '#E05252',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                {health.status === 'ok' ? 'System Online' : 'System Issue'}
              </span>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <div>DeFiLlama: Active</div>
              <div>CoinGecko: Active</div>
              <div>Telegram: {health.telegram_configured ? 'Active' : 'Not set'}</div>
              <div>Dune: {health.dune_configured ? 'Active' : 'Not set'}</div>
            </div>
          </div>
        )}
      </aside>

      <div
        className={`drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className={`mobile-drawer${drawerOpen ? ' open' : ''}`}>
        <div
          style={{
            padding: '0 12px 1.5rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              DeFi Scan
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Sustainability Analytics
            </div>
          </div>

          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            ×
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} style={linkStyle}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="mobile-bottomnav">
        <button className="tab-btn" onClick={() => setDrawerOpen((open) => !open)}>
          <span className="tab-icon">
            <Menu size={22} />
          </span>
          Menu
        </button>

        {NAV.slice(0, 4).map((n) => {
          const Icon = n.Icon

          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}
            >
              <span className="tab-icon">
                <Icon size={20} />
              </span>
              {n.short}
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}