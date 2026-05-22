// src/components/ProtocolTable.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, ScoreBadge, Sparkline, ProgressBar, Skeleton, ErrorState, EmptyState, Select } from './ui'
import { fmtUSD, fmtRatio, fmtPct, scoreStatus, CHART_COLORS } from '../utils/format'
import { useProtocols } from '../hooks/useData'

const SORT_OPTIONS = [
  { value: 'sustainability_score', label: 'Sustainability Score' },
  { value: 'daily_revenue',        label: 'Daily Revenue' },
  { value: 'real_yield_daily',     label: 'Real Yield' },
  { value: 'tvl',                  label: 'TVL' },
  { value: 'emissions_dependency_ratio', label: 'Emissions Ratio' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Lending', label: 'Lending' },
  { value: 'DEX', label: 'DEX' },
  { value: 'Perps', label: 'Perps/Derivatives' },
  { value: 'Staking', label: 'Staking' },
  { value: 'Stablecoin', label: 'Stablecoin' },
]

const COL = { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }
const GRID = '28px 1fr 70px 100px 100px 100px 80px 76px'

export default function ProtocolTable() {
  const [sortBy, setSortBy]   = useState('sustainability_score')
  const [order, setOrder]     = useState('desc')
  const [category, setCategory] = useState('')

  const { data, isLoading, error, refetch } = useProtocols({ sort_by: sortBy, order, category: category || undefined })

  if (isLoading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[...Array(8)].map((_, i) => <Skeleton key={i} height={44} />)}</div>
  if (error)     return <ErrorState message={error.message} onRetry={refetch} />

  const protocols = data?.protocols || []
  if (!protocols.length) return <EmptyState />

  const toggleOrder = () => setOrder(o => o === 'desc' ? 'asc' : 'desc')

  return (
    <div>
      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
        <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
        <button
          onClick={toggleOrder}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
        >
          {order === 'desc' ? '↓ Desc' : '↑ Asc'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {protocols.length} protocols
          {data?.last_refreshed && ` · updated ${new Date(data.last_refreshed).toLocaleTimeString()}`}
        </span>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '8px 16px', gap: 8, background: 'var(--table-header)', borderBottom: '1px solid var(--border)' }}>
          <span style={COL}>#</span>
          <span style={COL}>Protocol</span>
          <span style={COL}>Score</span>
          <span style={COL}>Revenue/day</span>
          <span style={COL}>Emissions/day</span>
          <span style={COL}>Real Yield</span>
          <span style={COL}>TVL</span>
          <span style={COL}>7d Rev</span>
        </div>

        {/* Rows */}
        {protocols.map((p, i) => {
          const st = scoreStatus(p.sustainability_score)
          const ry = p.real_yield_daily || 0
          const ryColor = ry >= 0 ? 'var(--success)' : 'var(--danger)'
          const ed = p.emissions_dependency_ratio || 0
          const edColor = ed > 1.5 ? 'var(--danger)' : ed > 1 ? 'var(--warning)' : ed > 0.6 ? '#E09B2D' : 'var(--success)'

          return (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                padding: '10px 16px',
                gap: 8,
                alignItems: 'center',
                borderBottom: i < protocols.length - 1 ? '1px solid var(--border-faint)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{i + 1}</span>

              <div>
                <Link to={`/protocol/${p.id}`} style={{ textDecoration: 'none' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{p.name}</span>
                </Link>
                {p.category && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{p.category}</span>
                )}
              </div>

              {/* Score */}
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: st.color }}>{p.sustainability_score?.toFixed(0)}</div>
                <ScoreBadge score={p.sustainability_score} />
              </div>

              {/* Revenue */}
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{fmtUSD(p.daily_revenue)}</span>

              {/* Emissions */}
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{fmtUSD(p.daily_emissions_usd)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: edColor, fontWeight: 500 }}>{fmtRatio(ed)}</span>
                  <ProgressBar value={Math.min(ed * 50, 100)} color={edColor} />
                </div>
              </div>

              {/* Real yield */}
              <span style={{ fontSize: 13, fontWeight: 600, color: ryColor }}>
                {ry >= 0 ? '+' : '−'}{fmtUSD(Math.abs(ry))}
              </span>

              {/* TVL */}
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{fmtUSD(p.tvl)}</span>
                {p.tvl_change_pct !== undefined && (
                  <div style={{ fontSize: 11, color: p.tvl_change_pct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {fmtPct(p.tvl_change_pct)}
                  </div>
                )}
              </div>

              {/* Sparkline */}
              <Sparkline
                data={p.revenue_history?.slice(-7)}
                color={
                  (p.revenue_history?.at(-1) || 0) > (p.revenue_history?.[0] || 0)
                    ? 'var(--success)'
                    : 'var(--danger)'
                }
                width={76}
                height={28}
              />
            </div>
          )
        })}
      </Card>
    </div>
  )
}
