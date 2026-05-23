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

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '15px',
          left: '15px',
          zIndex: 2000,
          padding: '10px',
          fontSize: '24px',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
        className="md:hidden"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside style={{
        width: '240px',
        height: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        padding: '20px 12px',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
      }}
      className="md:translate-x-0 md:static md:block"
      >
        <div style={{ marginBottom: '30px', padding: '0 12px' }}>
          <div style={{ fontSize: '20px', fontWeight: '700' }}>📈 DeFi Scan</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Sustainability Analytics</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? '#4f46e5' : '#666',
                background: isActive ? '#f0f0ff' : 'transparent',
                fontWeight: isActive ? '600' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              })}
              onClick={() => setIsOpen(false)}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
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
            zIndex: 999,
          }}
          className="md:hidden"
        />
      )}
    </>
  );
}