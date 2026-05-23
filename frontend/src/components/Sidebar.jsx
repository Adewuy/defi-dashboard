// src/components/Sidebar.jsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useHealth } from '../hooks/useData';

const NAV = [
  { to: '/',          icon: '📊', label: 'Dashboard' },
  { to: '/protocols', icon: '📋', label: 'All Protocols' },
  { to: '/compare',   icon: '⚖️', label: 'Compare' },
  { to: '/alerts',    icon: '🔔', label: 'Alerts' },
  { to: '/settings',  icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: health } = useHealth();

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
    background: isActive ? 'var(--accent-faint)' : 'transparent',
    transition: 'all 0.2s',
  });

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '15px',
          left: '15px',
          zIndex: 1000,
          padding: '8px 12px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 20,
          display: 'none', // Hidden on desktop
          '@media (max-width: 768px)': { display: 'block' }
        }}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside style={{
        width: 220,
        minHeight: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        padding: '1.5rem 0.75rem',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        transition: 'transform 0.3s ease',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        zIndex: 999,
        // Mobile styles
        '@media (max-width: 768px)': {
          position: 'fixed',
          height: '100vh',
          width: '260px',
        },
        // Desktop styles
        '@media (min-width: 769px)': {
          transform: 'none',
          display: 'flex',
          flexDirection: 'column',
        }
      }}>
        {/* Logo */}
        <div style={{ padding: '0 12px 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>📈 DeFi Scan</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Sustainability Analytics</div>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map(n => (
            <NavLink 
              key={n.to} 
              to={n.to} 
              end={n.to === '/'} 
              style={linkStyle}
              onClick={() => setIsOpen(false)} // Close on mobile after click
            >
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
            </div>
          </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 998,
            display: 'block',
            '@media (min-width: 769px)': { display: 'none' }
          }}
        />
      )}
    </>
  );
}