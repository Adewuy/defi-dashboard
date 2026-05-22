// src/components/ui.jsx — Reusable design-system primitives

import { scoreStatus, severityColor, fmtDate } from '../utils/format'

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, className = '' }) => (
  <div
    className={className}
    style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '1.25rem',
      ...style,
    }}
  >
    {children}
  </div>
)

// ── Section heading ───────────────────────────────────────────────────────────
export const SectionTitle = ({ children, sub, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
    <div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{children}</h2>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
)

// ── Score badge ───────────────────────────────────────────────────────────────
export const ScoreBadge = ({ score, size = 'sm' }) => {
  const st = scoreStatus(score)
  const sizes = { sm: { font: 11, px: '3px 8px' }, md: { font: 13, px: '4px 12px' } }
  const s = sizes[size] || sizes.sm
  return (
    <span style={{
      display: 'inline-block',
      fontSize: s.font,
      padding: s.px,
      borderRadius: 20,
      background: st.bg,
      color: st.textColor,
      fontWeight: 500,
      border: `1px solid ${st.color}22`,
      whiteSpace: 'nowrap',
    }}>
      {st.label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, color, icon }) => (
  <Card>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 600, color: color || 'var(--text-primary)', lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
  </Card>
)

// ── Loading skeleton ──────────────────────────────────────────────────────────
export const Skeleton = ({ width = '100%', height = 20, style = {} }) => (
  <div style={{
    width,
    height,
    background: 'linear-gradient(90deg, var(--skeleton-a) 25%, var(--skeleton-b) 50%, var(--skeleton-a) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 6,
    ...style,
  }} />
)

// ── Error state ───────────────────────────────────────────────────────────────
export const ErrorState = ({ message, onRetry }) => (
  <Card style={{ textAlign: 'center', padding: '2.5rem' }}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
    <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>Failed to load data</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{message}</div>
    {onRetry && (
      <button onClick={onRetry} style={{
        padding: '6px 16px', borderRadius: 8,
        background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13,
      }}>
        Retry
      </button>
    )}
  </Card>
)

// ── Empty state ───────────────────────────────────────────────────────────────
export const EmptyState = ({ message = 'No data yet. Backend is fetching data…' }) => (
  <Card style={{ textAlign: 'center', padding: '2.5rem' }}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{message}</div>
  </Card>
)

// ── Alert row ─────────────────────────────────────────────────────────────────
export const AlertRow = ({ alert, onAck }) => {
  const c = severityColor(alert.severity)
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 10,
      background: c.bg,
      border: `1px solid ${c.border}`,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{alert.message}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{fmtDate(alert.created_at)}</div>
      </div>
      {!alert.acknowledged && onAck && (
        <button
          onClick={() => onAck(alert.id)}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Ack
        </button>
      )}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, style = {} }) => {
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    outline: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    ghost:   { background: 'transparent', color: 'var(--text-muted)', border: 'none' },
  }
  const sizes = {
    sm: { fontSize: 12, padding: '5px 12px' },
    md: { fontSize: 13, padding: '7px 16px' },
    lg: { fontSize: 14, padding: '9px 20px' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Mini sparkline (SVG) ──────────────────────────────────────────────────────
export const Sparkline = ({ data, color = '#378ADD', width = 80, height = 28 }) => {
  if (!data || data.length < 2) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export const ProgressBar = ({ value, max = 100, color }) => {
  const pct = Math.min(100, (value / max) * 100)
  const barColor = color || (pct > 75 ? '#E05252' : pct > 50 ? '#E09B2D' : '#1D9E75')
  return (
    <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.4s' }} />
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: 2, background: 'var(--card-bg)', border: '1px solid var(--border)', padding: 3, borderRadius: 10 }}>
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: 'none',
          background: active === t.id ? 'var(--accent)' : 'transparent',
          color: active === t.id ? '#fff' : 'var(--text-muted)',
          fontSize: 13,
          fontWeight: active === t.id ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {t.label}
      </button>
    ))}
  </div>
)

// ── Select dropdown ───────────────────────────────────────────────────────────
export const Select = ({ value, onChange, options, style = {} }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: '6px 10px',
      borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'var(--card-bg)',
      color: 'var(--text-primary)',
      fontSize: 13,
      cursor: 'pointer',
      ...style,
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
)
