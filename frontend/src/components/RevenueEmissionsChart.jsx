// src/components/RevenueEmissionsChart.jsx
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { buildDayLabels, fmtUSD } from '../utils/format'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--tooltip-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{fmtUSD(p.value)}</span>
        </div>
      ))}
      {payload.length >= 2 && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>
          Real Yield: {fmtUSD((payload[0]?.value || 0) - (payload[1]?.value || 0))}
        </div>
      )}
    </div>
  )
}

export function ProtocolRevenueChart({ revenueHistory, emissionsHistory, height = 240 }) {
  const labels = buildDayLabels(revenueHistory?.length || 7)
  const data = (revenueHistory || []).map((rev, i) => ({
    date: labels[i] || `Day ${i + 1}`,
    Revenue: rev,
    Emissions: emissionsHistory?.[i] || 0,
    'Real Yield': rev - (emissionsHistory?.[i] || 0),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#378ADD" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#378ADD" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="emisGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#E05252" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#E05252" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
        <YAxis tickFormatter={(v) => fmtUSD(v, 0)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="Revenue" stroke="#378ADD" fill="url(#revGrad)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="Emissions" stroke="#E05252" fill="url(#emisGrad)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function RealYieldChart({ revenueHistory, emissionsHistory, height = 200 }) {
  const labels = buildDayLabels(revenueHistory?.length || 7)
  const data = (revenueHistory || []).map((rev, i) => ({
    date: labels[i] || `Day ${i + 1}`,
    'Real Yield': rev - (emissionsHistory?.[i] || 0),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
        <YAxis tickFormatter={(v) => fmtUSD(v, 0)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="Real Yield" stroke="#1D9E75" fill="url(#ryGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CompareChart({ protocols, height = 260 }) {
  if (!protocols?.length) return null

  const maxLen = Math.max(...protocols.map(p => p.revenue_history?.length || 0))
  const labels = buildDayLabels(maxLen)

  const data = labels.map((date, i) => {
    const row = { date }
    protocols.forEach(p => {
      row[`${p.name} Rev`] = p.revenue_history?.[i] || 0
    })
    return row
  })

  const COLORS = ['#378ADD', '#1D9E75', '#E09B2D', '#E05252', '#9B72DD', '#D45E8E']

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
        <YAxis tickFormatter={(v) => fmtUSD(v, 0)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {protocols.map((p, i) => (
          <Line
            key={p.id}
            type="monotone"
            dataKey={`${p.name} Rev`}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function TVLChart({ tvlHistory, height = 180 }) {
  const labels = buildDayLabels(tvlHistory?.length || 7)
  const data = (tvlHistory || []).map((v, i) => ({ date: labels[i], TVL: v }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9B72DD" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#9B72DD" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-faint)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
        <YAxis tickFormatter={(v) => fmtUSD(v, 0)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="TVL" stroke="#9B72DD" fill="url(#tvlGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
